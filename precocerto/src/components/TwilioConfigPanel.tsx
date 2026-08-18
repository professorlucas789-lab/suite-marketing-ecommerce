/**
 * TwilioConfigPanel Component
 * Configurar e testar credenciais Twilio
 * Fase 11: Integração Real de Notificações
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Key, Phone, Send, TestTube, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import {
  validateTwilioCredentials,
  getTwilioCredentialsFromFirestore,
  saveTwilioCredentialsToFirestore,
  testTwilioConnection,
  TwilioCredentials,
} from '../services/twilioService';

export const TwilioConfigPanel: React.FC = () => {
  const { user } = useUserAuth();
  const [credentials, setCredentials] = useState<TwilioCredentials>({
    accountSid: '',
    authToken: '',
    whatsappNumber: 'whatsapp:+1415555100',
    smsNumber: '+1415555100',
  });

  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validated, setValidated] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  const [showTokens, setShowTokens] = useState(false);

  // Carregar credenciais guardadas
  useEffect(() => {
    const loadCredentials = async () => {
      if (!user?.uid) return;
      const saved = await getTwilioCredentialsFromFirestore(user.uid);
      if (saved) {
        setCredentials(saved);
        setValidated(true);
      }
    };
    loadCredentials();
  }, [user?.uid]);

  const handleSaveCredentials = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const saved = await saveTwilioCredentialsToFirestore(user.uid, credentials);
      if (saved) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Erro ao guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCredentials = async () => {
    try {
      setValidating(true);
      const result = await validateTwilioCredentials(credentials);
      setValidated(result.valid);
      setTestResult({
        success: result.valid,
        message: result.message,
      });
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      setValidated(false);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao validar',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      alert('Por favor, insira um telefone para teste');
      return;
    }

    try {
      setLoading(true);
      const result = await testTwilioConnection(credentials, testPhone);
      setTestResult({
        success: result.success,
        message: result.error
          ? `Erro: ${result.error}`
          : `Mensagem enviada com sucesso! ID: ${result.messageId}`,
        messageId: result.messageId,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao testar',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-900 dark:to-blue-800 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">🔐 Configuração Twilio</h1>
        <p className="text-cyan-100">Integrar WhatsApp e SMS para notificações automáticas</p>
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border-2 p-4 ${
          validated
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
        }`}
      >
        <div className="flex items-center gap-3">
          {validated ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600" />
          )}
          <div>
            <p className={`font-bold ${validated ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
              {validated ? '✅ Credenciais Validadas' : '⚠️ Pendente de Validação'}
            </p>
            <p className={`text-sm ${validated ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {validated
                ? 'Pronto para enviar mensagens'
                : 'Complete os dados abaixo para ativar'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Credentials Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-600" />
          Credenciais Twilio
        </h2>

        <div className="space-y-4">
          {/* Account SID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Account SID
            </label>
            <input
              type={showTokens ? 'text' : 'password'}
              value={credentials.accountSid}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, accountSid: e.target.value }))
              }
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Encontre em: <code>console.twilio.com</code> → Account Info
            </p>
          </div>

          {/* Auth Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Auth Token
            </label>
            <input
              type={showTokens ? 'text' : 'password'}
              value={credentials.authToken}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, authToken: e.target.value }))
              }
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ⚠️ Mantenha em segredo! Nunca compartilhe
            </p>
          </div>

          {/* Toggle Show Tokens */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTokens}
              onChange={(e) => setShowTokens(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Mostrar tokens
            </span>
          </label>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Número Twilio para WhatsApp
            </label>
            <input
              type="text"
              value={credentials.whatsappNumber}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, whatsappNumber: e.target.value }))
              }
              placeholder="whatsapp:+244923456789"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formato: <code>whatsapp:+244...</code> (com código país)
            </p>
          </div>

          {/* SMS Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Número Twilio para SMS
            </label>
            <input
              type="text"
              value={credentials.smsNumber}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, smsNumber: e.target.value }))
              }
              placeholder="+244923456789"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Números Twilio comprados: <code>console.twilio.com → Phone Numbers</code>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSaveCredentials}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Guardando...' : 'Guardar Credenciais'}
          </button>

          <button
            onClick={handleValidateCredentials}
            disabled={validating || !credentials.accountSid || !credentials.authToken}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            {validating ? 'Validando...' : 'Validar Credenciais'}
          </button>
        </div>

        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3"
          >
            <p className="text-sm text-emerald-900 dark:text-emerald-100">
              ✅ Credenciais guardadas com sucesso!
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Test Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-purple-600" />
          Testar Conexão
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              🔢 Telefone para Teste (com +244)
            </label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+244923456789"
              disabled={!validated}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Será enviada uma mensagem de teste WhatsApp
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={loading || !validated || !testPhone}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Mensagem de Teste
              </>
            )}
          </button>

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border-2 p-4 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500'
              }`}
            >
              <p
                className={`text-sm ${
                  testResult.success
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {testResult.message}
              </p>
              {testResult.messageId && (
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                    {testResult.messageId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(testResult.messageId || '');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
      >
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3">
          📚 Como Configurar Twilio
        </h3>
        <ol className="text-sm text-blue-900 dark:text-blue-100 space-y-2 list-decimal list-inside">
          <li>
            Crie uma conta em{' '}
            <a
              href="https://www.twilio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-700"
            >
              twilio.com
            </a>
          </li>
          <li>
            Copie o <strong>Account SID</strong> e <strong>Auth Token</strong> de{' '}
            <code>console.twilio.com</code>
          </li>
          <li>
            Compre um número Twilio para WhatsApp e/ou SMS em{' '}
            <code>Phone Numbers → Buy</code>
          </li>
          <li>Cole os dados acima e clique em "Validar Credenciais"</li>
          <li>Teste com um número real em "Testar Conexão"</li>
          <li>
            Depois de confirmado, todos os alertas serão enviados automaticamente
          </li>
        </ol>
      </motion.div>

      {/* Pricing Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
      >
        <p className="text-sm text-amber-900 dark:text-amber-100">
          <strong>💰 Custo:</strong> WhatsApp: ~0.01 USD/msg | SMS: ~0.005 USD/msg (preços variam por país)
        </p>
      </motion.div>
    </motion.div>
  );
};

export default TwilioConfigPanel;
