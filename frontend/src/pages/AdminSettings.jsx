import { Settings, Shield, Bell, Smartphone, MonitorSmartphone, Map, ArrowRight } from 'lucide-react';

const AdminSettings = () => {
    return (
        <div className="grid gap-6">
            <div>
                <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>System Settings</h1>
                <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>Manage application preferences and future roadmap</p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>

                {/* Current Settings */}
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={20} className="text-primary" /> Configuration
                    </h3>

                    <div className="flex flex-col gap-4">
                        {[
                            { icon: Shield, title: 'Role Permissions', desc: 'Manage access levels for faculty and staff', active: true },
                            { icon: Map, title: 'Map Provider API', desc: 'Configure Leaflet/Google Maps API keys', active: true },
                            { icon: Bell, title: 'Notification Rules', desc: 'Setup email/SMS alerts for absentees', active: false },
                            { icon: Smartphone, title: 'Mobile App Sync', desc: 'Manage sync intervals for student mobile devices', active: true },
                        ].map((setting, idx) => {
                            const Icon = setting.icon;
                            return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                                            <Icon size={20} className="text-gray-600" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 500 }}>{setting.title}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{setting.desc}</p>
                                        </div>
                                    </div>

                                    {/* Toggle Switch Mock */}
                                    <div style={{
                                        width: '40px', height: '20px',
                                        backgroundColor: setting.active ? 'var(--color-primary)' : '#cbd5e1',
                                        borderRadius: '10px', position: 'relative',
                                        cursor: 'pointer'
                                    }}>
                                        <div style={{
                                            width: '16px', height: '16px',
                                            backgroundColor: 'white', borderRadius: '50%',
                                            position: 'absolute', top: '2px',
                                            left: setting.active ? '22px' : '2px',
                                            transition: 'left 0.2s',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Future Roadmap / Hackathon Pitch */}
                <div className="card" style={{ background: 'linear-gradient(180deg, white 0%, #f8fafc 100%)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MonitorSmartphone size={20} className="text-primary" /> Future Roadmap
                    </h3>

                    <div className="flex flex-col gap-6">
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            We plan to expand the SmartCollege ecosystem with the following features in phase 2:
                        </p>

                        <div style={{ position: 'relative', paddingLeft: '2rem', borderLeft: '2px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-2.5rem', top: '0', backgroundColor: 'var(--color-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '4px solid white' }}>1</div>
                                <h4 style={{ fontWeight: 600 }}>Face Authentication</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Combine geo-fencing with AI visual recognition to prevent proxy attendance and verify identity.</p>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-2.5rem', top: '0', backgroundColor: '#94a3b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '4px solid white' }}>2</div>
                                <h4 style={{ fontWeight: 600 }}>Parent Dashboard Portal</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Dedicated secure access for parents to view weekly attendance summaries and analytics.</p>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-2.5rem', top: '0', backgroundColor: '#94a3b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '4px solid white' }}>3</div>
                                <h4 style={{ fontWeight: 600 }}>Hostel Geo-fence Integration</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Automated hostel curfew management by tracking student presence in designated hostel zones after hours.</p>
                            </div>

                        </div>

                        <button className="btn btn-primary" style={{ marginTop: 'auto' }}>
                            View Technical Documentation <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSettings;
