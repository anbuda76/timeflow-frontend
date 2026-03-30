import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(res.message || "Se l'email esiste, riceverai le istruzioni per il reset.");
      // Dev mode: backend returns the link directly when no SMTP is configured
      if (res.dev_reset_link) {
        setDevLink(res.dev_reset_link);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la richiesta di reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⏱ TimeFlow</h1>
          <p className="text-gray-500 mt-2">Recupera la tua password</p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm text-center">
            {message}
          </div>
        )}

        {devLink && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 mb-4 text-sm">
            <p className="font-semibold mb-2">⚙️ Modalità sviluppo — nessun server email configurato</p>
            <p className="mb-2 text-xs text-amber-700">Usa questo link per completare il reset (valido 30 minuti):</p>
            <a
              href={devLink}
              className="block break-all text-blue-600 hover:underline text-xs font-mono bg-white rounded p-2 border border-amber-200"
            >
              {devLink}
            </a>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@azienda.it"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Invio in corso...' : 'Invia link di reset'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Ti sei ricordato la password?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Accedi
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
