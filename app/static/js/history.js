/* ═══════════════════════════════════════════════════════════
   PediAppend – history.js
   Script spécifique à la page d'historique (history.html).
   Gère : suppression d'un enregistrement, effacement complet
   de l'historique, et filtrage côté client.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    /* ═══ FILTRAGE CÔTÉ CLIENT ═══ */

    /**
     * Filtre les lignes du tableau d'historique en fonction du texte saisi
     * dans `#searchInput` et du type de résultat sélectionné dans `#filterResult`.
     * Affiche ou masque le message "aucun résultat" (`#filterEmpty`) en conséquence.
     *
     * Algorithme :
     *   1. Récupère les critères (texte normalisé, filtre de résultat).
     *   2. Pour chaque ligne `<tr>`, vérifie si le texte et le résultat correspondent.
     *   3. Affiche/masque la ligne et comptabilise les lignes visibles.
     *   4. Affiche `#filterEmpty` si aucune ligne n'est visible.
     */
    function filterRecords() {
        const query  = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const filter = document.getElementById('filterResult')?.value || 'all';
        let anyVisible = false;

        document.querySelectorAll('#historyTable tbody tr').forEach(tr => {
            const text        = tr.textContent.toLowerCase();
            const result      = tr.dataset.result;
            const matchText   = !query || text.includes(query);
            const matchFilter = filter === 'all' || result === filter;
            const show        = matchText && matchFilter;
            tr.style.display  = show ? '' : 'none';
            if (show) anyVisible = true;
        });

        const emptyMsg = document.getElementById('filterEmpty');
        if (emptyMsg) emptyMsg.hidden = anyVisible;
    }

    /* ═══ SUPPRESSION D'UN ENREGISTREMENT ═══ */

    /**
     * Supprime un enregistrement d'historique via DELETE /history/:id.
     * Recharge la page si la requête réussit, ou consigne l'erreur en console.
     * @param {string} id - Identifiant de l'enregistrement à supprimer.
     */
    function deleteRecord(id) {
        fetch('/history/' + encodeURIComponent(id), { method: 'DELETE' })
            .then(r => { if (r.ok) location.reload(); })
            .catch(err => console.error('[history] Erreur suppression :', err));
    }

    const table = document.getElementById('historyTable');
    if (table) {
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            if (btn.dataset.action !== 'delete-record') return;
            const id = btn.dataset.recordId;
            if (!id) return;
            if (!confirm('Supprimer cet enregistrement ?')) return;
            deleteRecord(id);
        });
    }

    /* ═══ EFFACEMENT COMPLET DE L'HISTORIQUE ═══ */

    /**
     * Efface tout l'historique via POST /history/clear.
     * Cette opération est irréversible : une confirmation est demandée.
     * Recharge la page si la requête réussit.
     */
    function clearHistory() {
        if (!confirm('Effacer tout l\'historique ? Cette action est irréversible.')) return;
        fetch('/history/clear', { method: 'POST' })
            .then(r => { if (r.ok) location.reload(); })
            .catch(err => console.error('[history] Erreur effacement :', err));
    }

    const clearBtn = document.querySelector('button[data-action="clear-history"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
    }

    /* ═══ ÉCOUTE DES FILTRES ═══ */
    const searchInput  = document.getElementById('searchInput');
    const resultSelect = document.getElementById('filterResult');

    if (searchInput)  searchInput.addEventListener('input', filterRecords);
    if (resultSelect) resultSelect.addEventListener('change', filterRecords);

    /* Calcul initial de l'état vide (utile si les filtres ont une valeur par défaut). */
    if (document.getElementById('historyTable')) filterRecords();

});
