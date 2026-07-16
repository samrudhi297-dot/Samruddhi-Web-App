import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient.js'
import { apiUrl, readJsonSafe } from '../utils/api.js'
import { verifyAdminAccess, isSupabaseBackendEnabled } from '../services/catalog.js'

import '../admin-panel.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginMode, setLoginMode] = useState('supabase') // 'supabase' | 'passcode'
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  
  // Reset Password states
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    // If already logged in, redirect to admin dashboard (unless it is a password recovery link)
    const checkSession = async () => {
      const hash = window.location.hash
      const isRecovery = hash && hash.includes('type=recovery')

      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (isRecovery) {
            setIsResettingPassword(true)
          } else {
            try {
              await verifyAdminSession(session.access_token)
              localStorage.setItem('adminToken', session.access_token)
              navigate('/admin')
            } catch {
              await supabase.auth.signOut()
              localStorage.removeItem('adminToken')
            }
          }
        }
      }
    }
    checkSession()
  }, [navigate])

  useEffect(() => {
    // Listen for the password recovery event from Supabase auth redirects
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const verifyAdminSession = async (token) => {
    // Passcode tokens are plain strings (not JWTs) — always validate via Express
    const looksLikeJwt = typeof token === 'string' && token.split('.').length === 3
    if (isSupabaseBackendEnabled() && looksLikeJwt) {
      return verifyAdminAccess()
    }
    const response = await fetch(apiUrl('/api/admin/session'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await readJsonSafe(response)
    if (!response.ok || !data?.ok) {
      const err = new Error(data?.error || 'This account is not authorized for admin access')
      err.status = response.status
      throw err
    }
    return data
  }

  const handleSupabaseLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        setError(authError.message)
      } else if (data?.session) {
        try {
          await verifyAdminSession(data.session.access_token)
          localStorage.setItem('adminToken', data.session.access_token)
          navigate('/admin')
        } catch (authErr) {
          await supabase.auth.signOut()
          localStorage.removeItem('adminToken')
          setError(authErr.message || 'Not authorized as admin. In Supabase SQL, set app_metadata.role to admin for this user.')
        }
      } else {
        setError('Login failed. No active session returned.')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during authentication.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasscodeLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      })

      const data = await readJsonSafe(response)
      if (response.ok && data?.ok) {
        try {
          await verifyAdminSession(data.token)
          localStorage.setItem('adminToken', data.token)
          navigate('/admin')
        } catch (authErr) {
          setError(authErr.message || 'Passcode accepted but session check failed')
        }
      } else {
        setError(data?.error || (response.ok ? 'Invalid passcode' : `Login failed (${response.status})`))
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during authentication. Is the API server running?')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      setIsLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin/login'
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccessMessage('Password reset link sent! Please check your email.')
        setIsForgotPassword(false)
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during password reset request.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccessMessage('Password updated successfully! You can now sign in with your new password.')
        setIsResettingPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        setLoginMode('supabase')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during password update.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <section className="admin-login-wrap">
        <div className="admin-login-card">
          <div className="text-center mb-4">
            <h2>Admin CRM</h2>
            <p className="admin-login-sub">
              {isResettingPassword ? 'Enter your new password' : isForgotPassword ? 'Reset your admin password' : 'Sign in with your Supabase admin email'}
            </p>
            {isSupabaseConfigured && !isForgotPassword && !isResettingPassword && loginMode === 'supabase' && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', marginBottom: 0 }}>
                Use the user from Supabase → Authentication → Users.
                After assigning <code style={{ color: '#FF7425' }}>app_metadata.role = admin</code>, sign out and sign in again.
              </p>
            )}
          </div>

          {/* Premium Tab Navigation (Only visible when NOT in Forgot Password or Resetting Password mode) */}
          {!isForgotPassword && !isResettingPassword && (
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #222',
              marginBottom: '25px',
              gap: '10px'
            }}>
              <button
                onClick={() => { setLoginMode('supabase'); setError(''); setSuccessMessage(''); setShowPassword(false); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'supabase' ? '2px solid #FF7425' : '2px solid transparent',
                  color: loginMode === 'supabase' ? '#FF7425' : '#888',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: '-2px'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setLoginMode('passcode'); setError(''); setSuccessMessage(''); setShowPassword(false); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'passcode' ? '2px solid #FF7425' : '2px solid transparent',
                  color: loginMode === 'passcode' ? '#FF7425' : '#888',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: '-2px'
                }}
              >
                Passcode
              </button>
            </div>
          )}

          {!isSupabaseConfigured && (loginMode === 'supabase' || isForgotPassword || isResettingPassword) && (
            <div className="alert alert-warning mb-4" role="alert" style={{ fontSize: '13px', background: '#3b2f1c', border: '1px solid #ffcc4d', color: '#ffe6a3', borderRadius: '6px', padding: '10px 15px' }}>
              <i className="fas fa-exclamation-triangle me-2" />
              <strong>Supabase Config Missing:</strong> Please add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file.
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', background: '#3b1c1c', border: '1px solid #ff4d4d', color: '#ffb3b3', borderRadius: '6px', padding: '10px 15px', marginBottom: '20px' }}>
              <i className="fas fa-exclamation-circle me-2" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success" role="alert" style={{ fontSize: '13px', background: '#1c3b24', border: '1px solid #4dff88', color: '#b3ffcc', borderRadius: '6px', padding: '10px 15px', marginBottom: '20px' }}>
              <i className="fas fa-check-circle me-2" />
              {successMessage}
            </div>
          )}

          {isResettingPassword ? (
            <form onSubmit={handleUpdatePassword}>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 45px 12px 16px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#1d1d1d',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 45px 12px 16px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#1d1d1d',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#FF7425',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1,
                  marginBottom: '15px'
                }}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsResettingPassword(false); setError(''); setSuccessMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#aaa',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#FF7425'}
                  onMouseOut={(e) => e.target.style.color = '#aaa'}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={!isSupabaseConfigured}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                    color: '#fff',
                    fontSize: '15px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !isSupabaseConfigured}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#FF7425',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isSupabaseConfigured ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: (isLoading || !isSupabaseConfigured) ? 0.7 : 1,
                  marginBottom: '15px'
                }}
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#aaa',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#FF7425'}
                  onMouseOut={(e) => e.target.style.color = '#aaa'}
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <>
              {loginMode === 'supabase' && (
                <form onSubmit={handleSupabaseLogin}>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!isSupabaseConfigured}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                        color: '#fff',
                        fontSize: '15px'
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF7425',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={!isSupabaseConfigured}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '12px 45px 12px 16px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                          color: '#fff',
                          fontSize: '15px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isSupabaseConfigured}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#FF7425',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: isSupabaseConfigured ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: (isLoading || !isSupabaseConfigured) ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Access Dashboard'}
                  </button>
                </form>
              )}

              {loginMode === 'passcode' && (
                <form onSubmit={handlePasscodeLogin}>
                  <div className="mb-4">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Admin Passcode
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter admin passcode"
                        style={{
                          width: '100%',
                          padding: '12px 45px 12px 16px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          background: '#1d1d1d',
                          color: '#fff',
                          fontSize: '15px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#FF7425',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Access Dashboard'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
