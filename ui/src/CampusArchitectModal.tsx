import { useState } from 'react';
import {
  type CampusBuildingData,
  getCampusBuildings,
  saveCampusBuildings,
  resetCampusBuildings,
} from './campusStore';
import { playSound } from './audio';

function Symbol({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

interface CampusArchitectModalProps {
  onClose: () => void;
  onSave?: (buildings: CampusBuildingData[]) => void;
}

export default function CampusArchitectModal({ onClose, onSave }: CampusArchitectModalProps) {
  const [buildings, setBuildings] = useState<CampusBuildingData[]>(() => getCampusBuildings());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state for add / edit
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<CampusBuildingData['type']>('academic');
  const [formX, setFormX] = useState<number>(0);
  const [formZ, setFormZ] = useState<number>(0);
  const [formFloors, setFormFloors] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const startEdit = (b: CampusBuildingData) => {
    setEditingId(b.id);
    setFormName(b.name);
    setFormCode(b.code);
    setFormType(b.type);
    setFormX(b.coordinates.x);
    setFormZ(b.coordinates.z);
    setFormFloors(b.floors.join(', '));
    setShowAddForm(false);
  };

  const startAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormType('academic');
    setFormX(Math.round((Math.random() * 20 - 10) * 10) / 10);
    setFormZ(Math.round((Math.random() * 16 - 8) * 10) / 10);
    setFormFloors('Floor 1 (Labs), Floor 2 (Classrooms), Common Washrooms');
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showToast('Please provide a name and code for the building.');
      return;
    }

    const floorsList = formFloors
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    // Calculate approx 2D map position (percentage based on x from -18 to 18, z from -14 to 14)
    const mapX = Math.round(Math.min(92, Math.max(8, ((formX + 18) / 36) * 100)));
    const mapY = Math.round(Math.min(92, Math.max(8, ((formZ + 14) / 28) * 100)));

    if (editingId) {
      // Update existing
      const updated = buildings.map((b) => {
        if (b.id === editingId) {
          return {
            ...b,
            name: formName.trim(),
            code: formCode.trim().toUpperCase(),
            type: formType,
            coordinates: { x: formX, y: b.coordinates.y || 1.4, z: formZ },
            mapPosition: { x: mapX, y: mapY },
            floors: floorsList.length > 0 ? floorsList : b.floors,
          };
        }
        return b;
      });
      setBuildings(updated);
      saveCampusBuildings(updated);
      onSave?.(updated);
      cancelForm();
      playSound('success');
      showToast(`Updated "${formName}" in campus blueprint.`);
    } else {
      // Create new building
      const newId = `b-custom-${Date.now()}`;
      const newBuilding: CampusBuildingData = {
        id: newId,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        type: formType,
        coordinates: { x: formX, y: 1.4, z: formZ },
        mapPosition: { x: mapX, y: mapY },
        floors: floorsList.length > 0 ? floorsList : ['Ground Floor', 'Floor 1'],
      };
      const updated = [...buildings, newBuilding];
      setBuildings(updated);
      saveCampusBuildings(updated);
      onSave?.(updated);
      cancelForm();
      playSound('success');
      showToast(`Added "${formName}" to campus architecture.`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (buildings.length <= 1) {
      showToast('Campus must contain at least one architectural zone.');
      return;
    }
    const updated = buildings.filter((b) => b.id !== id);
    setBuildings(updated);
    saveCampusBuildings(updated);
    onSave?.(updated);
    if (editingId === id) cancelForm();
    playSound('click');
    showToast(`Removed "${name}" from campus.`);
  };

  const handleReset = () => {
    const defaults = resetCampusBuildings();
    setBuildings(defaults);
    onSave?.(defaults);
    cancelForm();
    playSound('success');
    showToast('Campus architecture restored to institutional blueprint.');
  };

  return (
    <div className="credential-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="campus-architect-modal">
        {/* Header */}
        <div className="architect-header">
          <div className="architect-header-title">
            <div className="architect-mark">
              <Symbol name="architecture" filled />
            </div>
            <div>
              <h3>Institutional Campus Architect</h3>
              <p>Design individual buildings, 3D coordinates, codes, and zone floor plans for your university.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close architect">
            <Symbol name="close" />
          </button>
        </div>

        {toast && (
          <div className="architect-toast">
            <Symbol name="check_circle" filled />
            <span>{toast}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="architect-toolbar">
          <div className="architect-count-pill">
            <Symbol name="domain" />
            <span>{buildings.length} Campus Zones Configured</span>
          </div>
          <div className="architect-toolbar-actions">
            <button
              type="button"
              className="button secondary compact"
              onClick={handleReset}
              title="Reset to default blueprint"
            >
              <Symbol name="restart_alt" />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              className="button primary compact"
              onClick={startAdd}
              disabled={showAddForm}
            >
              <Symbol name="add" />
              <span>Add Building / Zone</span>
            </button>
          </div>
        </div>

        {/* Add / Edit Form Modal Form */}
        {(showAddForm || editingId) && (
          <form className="architect-form-card" onSubmit={handleSaveItem}>
            <div className="form-head-row">
              <h4>{editingId ? 'Edit Building Specification' : 'Architect New Campus Building'}</h4>
              <button type="button" className="icon-button" onClick={cancelForm} aria-label="Cancel editing">
                <Symbol name="close" />
              </button>
            </div>

            <div className="form-grid-2col">
              <label>
                <span>Building Name</span>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Kalam Computing Quad"
                />
              </label>

              <label>
                <span>Building Code</span>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. KC-QUAD"
                  style={{ textTransform: 'uppercase' }}
                />
              </label>
            </div>

            <div className="form-grid-3col">
              <label>
                <span>Zone Category</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CampusBuildingData['type'])}
                >
                  <option value="academic">Academic / Department</option>
                  <option value="hostel">Hostel / Residence</option>
                  <option value="library">Library / Commons</option>
                  <option value="dining">Dining / Food Court</option>
                  <option value="hub">Facilities / Dispatch Hub</option>
                </select>
              </label>

              <label>
                <span>3D X Position (-16 to 16)</span>
                <input
                  type="number"
                  step="0.5"
                  min="-16"
                  max="16"
                  value={formX}
                  onChange={(e) => setFormX(Number(e.target.value))}
                />
              </label>

              <label>
                <span>3D Z Position (-12 to 12)</span>
                <input
                  type="number"
                  step="0.5"
                  min="-12"
                  max="12"
                  value={formZ}
                  onChange={(e) => setFormZ(Number(e.target.value))}
                />
              </label>
            </div>

            <label>
              <span>Floors & Labs (comma-separated)</span>
              <input
                type="text"
                value={formFloors}
                onChange={(e) => setFormFloors(e.target.value)}
                placeholder="Floor 1 (Circulation), Floor 2 (Quiet Study), Wi-Fi Commons"
              />
            </label>

            <div className="form-actions-row">
              <button type="button" className="button secondary compact" onClick={cancelForm}>
                Cancel
              </button>
              <button type="submit" className="button primary compact">
                <Symbol name="save" />
                <span>{editingId ? 'Save Changes' : 'Add to Campus'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Building List Cards */}
        <div className="architect-building-list">
          {buildings.map((b) => (
            <div className={`architect-building-card ${editingId === b.id ? 'active-editing' : ''}`} key={b.id}>
              <div className="building-card-left">
                <div className={`building-type-badge type-${b.type}`}>
                  <Symbol
                    name={
                      b.type === 'library'
                        ? 'local_library'
                        : b.type === 'hostel'
                          ? 'hotel'
                          : b.type === 'dining'
                            ? 'restaurant'
                            : b.type === 'hub'
                              ? 'build'
                              : 'school'
                    }
                  />
                  <span>{b.type.toUpperCase()}</span>
                </div>
                <div className="building-identity">
                  <strong>{b.name}</strong>
                  <div className="building-sub-row">
                    <span className="building-code-tag">{b.code}</span>
                    <span className="building-coords-tag">
                      <Symbol name="pin_drop" /> [{b.coordinates.x}, {b.coordinates.z}]
                    </span>
                  </div>
                  <div className="building-floors-chips">
                    {b.floors.map((fl, idx) => (
                      <span key={idx} className="floor-chip">{fl}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="building-card-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => startEdit(b)}
                  title={`Edit ${b.name}`}
                >
                  <Symbol name="edit" />
                </button>
                <button
                  type="button"
                  className="icon-button danger-hover"
                  onClick={() => handleDelete(b.id, b.name)}
                  title={`Remove ${b.name}`}
                >
                  <Symbol name="delete" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="architect-footer">
          <span className="footer-status">
            <Symbol name="verified" filled />
            All campus modifications sync automatically with 3D Digital Twin & Incident Dispatch.
          </span>
          <button type="button" className="button primary" onClick={onClose}>
            Done Designing
          </button>
        </div>
      </div>
    </div>
  );
}
