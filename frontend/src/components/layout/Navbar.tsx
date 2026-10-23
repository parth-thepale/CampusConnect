import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import {
  Building2,
  LogOut,
  PlusCircle,
  ListFilter,
  ShieldAlert,
  Menu,
  X,
  ClipboardList,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isStaffOrAdmin = role === 'staff' || role === 'admin';

  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: '0 var(--space-4)',
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--color-text)',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-inverted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={20} />
          </div>
          <span>Campus<span style={{ color: 'var(--color-primary)' }}>Connect</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'none', alignItems: 'center', gap: 'var(--space-2)' }} className="desktop-nav">
          {user && (
            <>
              <Link
                to="/student"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: location.pathname === '/student' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: location.pathname === '/student' ? 600 : 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <ClipboardList size={16} />
                Student Portal
              </Link>
              <Link
                to="/student/report"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: location.pathname === '/student/report' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: location.pathname === '/student/report' ? 600 : 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <PlusCircle size={16} />
                Report Issue
              </Link>
              <Link
                to="/student/tickets"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: location.pathname === '/student/tickets' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: location.pathname === '/student/tickets' ? 600 : 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <ListFilter size={16} />
                My Tickets
              </Link>
              {isStaffOrAdmin && (
                <Link
                  to="/staff"
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    color: location.pathname.startsWith('/staff') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: location.pathname.startsWith('/staff') ? 600 : 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    backgroundColor: 'var(--color-surface-hover)',
                  }}
                >
                  <ShieldAlert size={16} />
                  Staff Queue
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {user ? (
            <>
              <div
                style={{
                  display: 'none',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
                className="desktop-user"
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  {profile?.displayName || user.email || 'Campus User'}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: isStaffOrAdmin ? 'var(--status-assigned-text)' : 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {role || 'Student'}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="desktop-signout"
              >
                <LogOut size={16} />
                <span className="desktop-signout-text">Sign Out</span>
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile Menu Hamburger Button */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="mobile-hamburger"
              style={{
                display: 'flex',
                background: 'none',
                border: 'none',
                color: 'var(--color-text)',
                padding: 'var(--space-1)',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
          className="mobile-menu"
        >
          <div
            style={{
              padding: 'var(--space-2) 0',
              borderBottom: '1px solid var(--color-border-subtle)',
              marginBottom: 'var(--space-2)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {profile?.displayName || user.email}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              Role: {role || 'Student'}
            </div>
          </div>

          <Link
            to="/student"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.95rem',
            }}
          >
            <ClipboardList size={18} />
            Student Dashboard
          </Link>
          <Link
            to="/student/report"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.95rem',
            }}
          >
            <PlusCircle size={18} />
            Report Issue
          </Link>
          <Link
            to="/student/tickets"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.95rem',
            }}
          >
            <ListFilter size={18} />
            My Tickets
          </Link>
          {isStaffOrAdmin && (
            <Link
              to="/staff"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: 'var(--space-2)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '0.95rem',
              }}
            >
              <ShieldAlert size={18} />
              Staff Queue
            </Link>
          )}

          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              style={{ width: '100%' }}
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Inline styles for responsive visibility */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .desktop-user { display: flex !important; }
          .mobile-hamburger { display: none !important; }
          .mobile-menu { display: none !important; }
          .desktop-signout-text { display: inline !important; }
        }
        @media (max-width: 767px) {
          .desktop-signout-text { display: none; }
        }
      `}</style>
    </header>
  );
};
