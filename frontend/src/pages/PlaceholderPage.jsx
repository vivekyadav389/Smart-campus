import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
    return (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '50%', color: 'var(--color-text-secondary)' }}>
                <Construction size={48} />
            </div>
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', maxWidth: '400px' }}>
                    This section is currently under construction and will be available in the next release.
                </p>
            </div>
        </div>
    );
};

export default PlaceholderPage;
