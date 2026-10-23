import { getFirestore } from './client';
import {
  User,
  Intake,
  Ticket,
  TicketEvent,
  TicketStatus,
  Category,
} from '../../types/domain';
import {
  IUserRepository,
  IIntakeRepository,
  ITicketRepository,
  IEventRepository,
  IRepositoryRegistry,
  TicketFilter,
} from '../interfaces';

export class FirestoreUserRepository implements IUserRepository {
  private get collection() {
    return getFirestore().collection('users');
  }

  async findByUid(uid: string): Promise<User | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as User;
  }

  async createOrUpdate(user: User): Promise<User> {
    await this.collection.doc(user.uid).set(user, { merge: true });
    return user;
  }
}

export class FirestoreIntakeRepository implements IIntakeRepository {
  private get collection() {
    return getFirestore().collection('intakes');
  }

  async findById(intakeId: string): Promise<Intake | null> {
    const doc = await this.collection.doc(intakeId).get();
    if (!doc.exists) return null;
    return doc.data() as Intake;
  }

  async create(intake: Intake): Promise<Intake> {
    await this.collection.doc(intake.intakeId).set(intake);
    return intake;
  }

  async update(intakeId: string, data: Partial<Intake>): Promise<Intake> {
    const docRef = this.collection.doc(intakeId);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await docRef.update(updatedData);
    const updated = await docRef.get();
    return updated.data() as Intake;
  }

  async listByCreatedByUid(uid: string): Promise<Intake[]> {
    const snap = await this.collection
      .where('createdByUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data() as Intake);
  }
}

export class FirestoreTicketRepository implements ITicketRepository {
  private get collection() {
    return getFirestore().collection('tickets');
  }

  async getNextTicketNumber(): Promise<string> {
    const db = getFirestore();
    const counterRef = db.collection('counters').doc('tickets');

    return await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1001;

      if (counterDoc.exists) {
        const current = counterDoc.data()?.current;
        if (typeof current === 'number') {
          nextNumber = current + 1;
        }
      }

      transaction.set(counterRef, { current: nextNumber }, { merge: true });
      return `CC-${nextNumber}`;
    });
  }

  async findById(ticketId: string): Promise<Ticket | null> {
    const doc = await this.collection.doc(ticketId).get();
    if (!doc.exists) return null;
    return doc.data() as Ticket;
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    const snap = await this.collection.where('ticketNumber', '==', ticketNumber).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].data() as Ticket;
  }

  async create(ticket: Ticket, initialEvent: TicketEvent): Promise<Ticket> {
    const db = getFirestore();
    const batch = db.batch();

    const ticketRef = this.collection.doc(ticket.ticketId);
    batch.set(ticketRef, ticket);

    const eventRef = ticketRef.collection('events').doc(initialEvent.eventId);
    batch.set(eventRef, initialEvent);

    await batch.commit();
    return ticket;
  }

  async update(ticketId: string, data: Partial<Ticket>, event?: TicketEvent): Promise<Ticket> {
    const db = getFirestore();
    const batch = db.batch();

    const ticketRef = this.collection.doc(ticketId);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    batch.update(ticketRef, updatedData);

    if (event) {
      const eventRef = ticketRef.collection('events').doc(event.eventId);
      batch.set(eventRef, event);
    }

    await batch.commit();
    const updated = await ticketRef.get();
    return updated.data() as Ticket;
  }

  async list(filter: TicketFilter): Promise<{ items: Ticket[]; total: number }> {
    let query: FirebaseFirestore.Query = this.collection;

    if (filter.createdByUid) {
      query = query.where('createdByUid', '==', filter.createdByUid);
    }
    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }
    if (filter.category) {
      query = query.where('category', '==', filter.category);
    }
    if (filter.assignedToUid) {
      query = query.where('assignedToUid', '==', filter.assignedToUid);
    }

    query = query.orderBy('createdAt', 'desc');

    const snap = await query.offset(filter.offset).limit(filter.limit).get();
    const items = snap.docs.map((d) => d.data() as Ticket);

    // Get total count
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    return { items, total };
  }
}

export class FirestoreEventRepository implements IEventRepository {
  async create(event: TicketEvent): Promise<TicketEvent> {
    const db = getFirestore();
    await db
      .collection('tickets')
      .doc(event.ticketId)
      .collection('events')
      .doc(event.eventId)
      .set(event);
    return event;
  }

  async listByTicketId(ticketId: string): Promise<TicketEvent[]> {
    const db = getFirestore();
    const snap = await db
      .collection('tickets')
      .doc(ticketId)
      .collection('events')
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map((d) => d.data() as TicketEvent);
  }
}

export function createFirestoreRepositories(): IRepositoryRegistry {
  return {
    users: new FirestoreUserRepository(),
    intakes: new FirestoreIntakeRepository(),
    tickets: new FirestoreTicketRepository(),
    events: new FirestoreEventRepository(),
  };
}
