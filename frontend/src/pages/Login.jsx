import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticateUser } from '../utils/mockDb';

const Login = ({ onLogin }) => {
    // We get deviceId from the centralized context now
    const { login, deviceId } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // If they were redirected here forcefully via Auto-Logout polling
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('reason') === 'device_changed') {
            setError('You have been signed out because your account was accessed from a newly authorized device.');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userData');
        }
    }, [location]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error on typing
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!credentials.email || !credentials.password) {
            setError('Please enter both email and password.');
            return;
        }

        setIsAnimating(true);

        try {
            const result = await authenticateUser(credentials.email, credentials.password, deviceId);

            if (result.success) {
                const user = result.user;
                login(user); // AuthContext function
                if (onLogin) onLogin(user);

                // Navigate to intended page or dashboard
                const from = location.state?.from?.pathname || `/${user.role}/dashboard`;
                // Add a small delay for UX so they see the success state
                setTimeout(() => navigate(from, { replace: true }), 400);
            } else {
                setError(result.error || 'Login failed.');
                setIsAnimating(false);
            }
        } catch (err) {
            setError('An error occurred during login. Is the server running?');
            setIsAnimating(false);
        }
    };

    const fillDemoCredentials = (role) => {
        setError('');
        if (role === 'admin') setCredentials({ email: 'admin@smartcollege.edu', password: 'admin' });
        if (role === 'teacher') setCredentials({ email: 'teacher@smartcollege.edu', password: 'password123' });
        if (role === 'student') setCredentials({ email: 'student@smartcollege.edu', password: 'password123' });
    };

    return (
        <div className="login-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            padding: '1rem'
        }}>
            <div className="card" style={{
                maxWidth: '440px',
                width: '100%',
                padding: '2.5rem',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
            }}>

                {/* Decorative elements */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--color-primary)', opacity: '0.05', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'var(--color-success)', opacity: '0.05', borderRadius: '50%' }}></div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '1rem',
                        background: 'var(--color-primary)',
                        color: 'white',
                        marginBottom: '1rem'
                    }}>
                        <MapPin size={28} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        Sign in to your SmartCampus account
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--color-danger-bg)',
                            color: 'var(--color-danger)',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                name="email"
                                value={credentials.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    outline: 'none',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={credentials.password}
                                onChange={handleInputChange}
                                placeholder="Enter password provided by Admin"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 2.75rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    outline: 'none',
                                    fontSize: '0.95rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                style={{
                                    position: 'absolute', right: '1rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer',
                                    color: 'var(--color-text-secondary)', display: 'flex', padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            fontSize: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            opacity: isAnimating ? 0.8 : 1,
                            marginTop: '0.5rem'
                        }}
                        disabled={isAnimating}
                    >
                        {isAnimating ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg className="animate-spin" style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Sign In <ArrowRight size={18} />
                            </span>
                        )}
                    </button>
                </form>

                {/* Hackathon Demo Helper */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '0.75rem' }}>
                        Quick Fill Demo Credentials
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => fillDemoCredentials('student')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem', color: '#475569' }}>Student</button>
                        <button onClick={() => fillDemoCredentials('teacher')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem', color: '#475569' }}>Teacher</button>
                        <button onClick={() => fillDemoCredentials('admin')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem', color: '#475569' }}>Admin</button>
                    </div>
                </div>

            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input:focus {
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                }
            `}</style>
        </div>
    );
};

export default Login;
