// src/pages/secretary/Payments.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { paymentService } from '../../services/paymentService';
import { secretaryService } from '../../services/secretaryService';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { CreditCard, BellRing, History, AlertCircle, DollarSign, CheckCircle2 } from 'lucide-react';

export default function SecretaryPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [selectedPay, setSelectedPay] = useState(null);
  const [reminderNote, setReminderNote] = useState('');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [user]);

  const loadPayments = async () => {
    const docId = await secretaryService.resolveDoctorIdForUser(user);
    if (!docId) {
      setPayments([]);
      return;
    }
    const list = await paymentService.getPaymentsByDoctor(docId);
    setPayments(list);
  };

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!selectedPay) return;
    await paymentService.sendPaymentReminder(selectedPay.id, reminderNote);
    setIsReminderModalOpen(false);
    setReminderNote('');
    loadPayments();
  };

  const openReminderModal = (pay) => {
    setSelectedPay(pay);
    setReminderNote(`Relance pour solde restant dû de ${pay.remainingAmount} DT pour actes médicaux.`);
    setIsReminderModalOpen(true);
  };

  const openHistoryModal = (pay) => {
    setSelectedPay(pay);
    setIsHistoryModalOpen(true);
  };

  const columns = [
    { header: 'Patient', accessor: 'patientName' },
    {
      header: 'Montant Total',
      render: (p) => <span className="font-bold text-slate-900">{p.totalAmount} DT</span>
    },
    {
      header: 'Montant Payé',
      render: (p) => <span className="text-emerald-700 font-semibold">{p.paidAmount} DT</span>
    },
    {
      header: 'Montant Restant (Dette)',
      render: (p) => <span className="text-rose-700 font-bold">{p.remainingAmount} DT</span>
    },
    { header: 'Date Échéance', accessor: 'dueDate' },
    {
      header: 'Statut',
      render: (p) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          p.status === 'Payé' ? 'bg-emerald-100 text-emerald-800' : p.status === 'Partiellement payé' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
        }`}>
          {p.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Paiements & Relances de Dettes</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Suivi des encaissements, relance automatique des impayés et historique des communications financières.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Rechercher par patient ou statut..."
        actions={(p) => (
          <div className="flex items-center justify-end space-x-2">
            {p.remainingAmount > 0 && (
              <button
                onClick={() => openReminderModal(p)}
                className="flex items-center px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <BellRing className="w-3.5 h-3.5 mr-1" />
                Effectuer une relance
              </button>
            )}
            <button
              onClick={() => openHistoryModal(p)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              title="Historique des relances"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Modal Effectuer une relance */}
      {selectedPay && (
        <Modal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          title={`Effectuer une relance de paiement pour ${selectedPay.patientName}`}
        >
          <form onSubmit={handleSendReminder} className="space-y-4">
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-xs">
              <span className="font-bold text-rose-900 block">Dette Restante : {selectedPay.remainingAmount} DT</span>
              <span className="text-rose-700">Date d'échéance : {selectedPay.dueDate}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message de relance (SMS / Notification)</label>
              <textarea
                rows={3}
                required
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Envoyer la relance
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Historique des relances */}
      {selectedPay && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title={`Historique des relances : ${selectedPay.patientName}`}
        >
          <div className="space-y-3">
            {selectedPay.reminderHistory && selectedPay.reminderHistory.length > 0 ? (
              selectedPay.reminderHistory.map((rem, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border text-xs">
                  <span className="font-bold text-slate-900 block">{rem.date}</span>
                  <p className="text-slate-600 mt-0.5">{rem.note}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Aucune relance effectuée pour le moment.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
