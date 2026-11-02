// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/api';
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [is2faRequired, setIs2faRequired] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.requires2fa) {
        setIs2faRequired(true);
        setPreAuthToken(res.preAuthToken || '');
        setInfoMessage(res.message || 'Veuillez saisir le code OTP envoyé par email.');
        setLoading(false);
        return;
      }

      if (res && res.role) {
        redirectUserByRole(res.role);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2faSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await verify2FA(preAuthToken, otpCode);
      if (loggedUser && loggedUser.role) {
        redirectUserByRole(loggedUser.role);
      } else {
        throw new Error('Échec de la validation du code 2FA.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const redirectUserByRole = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'doctor':
        navigate('/doctor/dashboard');
        break;
      case 'secretary':
        navigate('/secretary/dashboard');
        break;
      case 'patient':
        navigate('/patient/dashboard');
        break;
      default:
        navigate('/patient/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-4xl w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 grid grid-cols-1 md:grid-cols-12">
        {/* Left Visual Brand Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/20 mb-6">
              M+
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">MedSecretariat</h1>
            <p className="text-teal-200 text-xs sm:text-sm mt-2 leading-relaxed">
              Plateforme intelligente de gestion du secrétariat médical, dossiers patients, imagerie et télé-communication.
            </p>
          </div>

          <div className="relative z-10 mt-8 space-y-3">
            <div className="flex items-center space-x-3 text-xs text-teal-100 bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
              <Sparkles className="w-5 h-5 text-teal-300 shrink-0" />
              <span>Gestion multi-rôles sécurisée : Administrateurs, Médecins, Secrétaires & Patients.</span>
            </div>
          </div>

          {/* Subtle Decorative Pattern */}
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {is2faRequired ? 'Double Authentification (2FA)' : 'Connexion à votre Espace'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {is2faRequired
                ? infoMessage || 'Entrez le code OTP à 6 chiffres envoyé à votre adresse email.'
                : 'Saisissez vos identifiants pour vous connecter.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {is2faRequired ? (
            <form onSubmit={handleVerify2faSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code OTP (6 chiffres)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 tracking-widest focus:outline-hidden focus:border-teal-600 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !otpCode}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Vérification...' : 'Valider le code OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => { setIs2faRequired(false); setError(''); }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                ← Retour au formulaire de connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@medsecretariat.fr"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-teal-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-teal-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Connexion en cours...' : 'Se Connecter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
