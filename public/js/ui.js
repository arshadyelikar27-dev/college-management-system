(function() {
    let container = null;

    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    window.showToast = function(type = 'success', title = '', message = '', duration = 4000) {
        const icons = {
            success: 'fas fa-check-circle',
            error:   'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info:    'fas fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type] || icons.info}"></i>
            <div class="toast-body">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="toast-progress"></div>
        `;

        getContainer().appendChild(toast);

        const timer = setTimeout(() => removeToast(toast), duration);
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timer);
            removeToast(toast);
        });

        return toast;
    };

    function removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 350);
    }

    const _originalConfirm = window.confirm;
    window.showConfirm = function(message, onConfirm, title = 'Confirm Action') {

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="glass-card modal-box reveal-scale" style="max-width:420px; text-align:center; padding:2.5rem;">
                <div style="width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:1.75rem;color:var(--warning);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="margin-bottom:0.75rem;">${title}</h3>
                <p style="color:var(--text-secondary);margin-bottom:2rem;font-size:0.9rem;line-height:1.6;">${message}</p>
                <div class="flex gap-3 justify-center">
                    <button class="btn btn-secondary" id="confirm-cancel" style="min-width:120px;">Cancel</button>
                    <button class="btn btn-primary" id="confirm-ok" style="min-width:120px;">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); if (onConfirm) onConfirm(); };
    };
})();

window.animateCounter = function(el, target, duration = 1200, prefix = '') {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(easeOut(progress) * target);
        el.textContent = prefix + value.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
};

window.TableUtil = {
    init(tableId, { pageSize = 10 } = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;
        this._table = table;
        this._pageSize = pageSize;
        this._currentPage = 1;
        this._sortCol = -1;
        this._sortDir = 1;

        table.querySelectorAll('th[data-sort]').forEach((th, idx) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => this.sortBy(idx));
        });
    },

    sortBy(colIdx) {
        const tbody = this._table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (this._sortCol === colIdx) {
            this._sortDir *= -1;
        } else {
            this._sortCol = colIdx;
            this._sortDir = 1;
        }
        rows.sort((a, b) => {
            const av = a.cells[colIdx]?.textContent.trim() || '';
            const bv = b.cells[colIdx]?.textContent.trim() || '';
            const n = (v) => parseFloat(v.replace(/[^\d.-]/g, ''));
            const an = n(av), bn = n(bv);
            if (!isNaN(an) && !isNaN(bn)) return this._sortDir * (an - bn);
            return this._sortDir * av.localeCompare(bv);
        });
        rows.forEach(r => tbody.appendChild(r));

        this._table.querySelectorAll('th').forEach((th, i) => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (i === colIdx) th.classList.add(this._sortDir === 1 ? 'sort-asc' : 'sort-desc');
        });
    }
};

window.exportCSV = function(tableId, filename = 'export.csv') {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll('tr');
    const csv = Array.from(rows).map(r =>
        Array.from(r.querySelectorAll('th,td'))
            .map(c => '"' + c.textContent.trim().replace(/"/g, '""') + '"')
            .join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    showToast('success', 'Export Complete', `${filename} downloaded successfully.`);
};

window.initDropZone = function(dropZoneId, inputId, previewId) {
    const zone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            input.files = files;
            updateDropZoneLabel(zone, files[0].name);
        }
    });
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files[0]) updateDropZoneLabel(zone, input.files[0].name);
    });
};

function updateDropZoneLabel(zone, name) {
    const label = zone.querySelector('.drop-label');
    if (label) {
        label.innerHTML = `<i class="fas fa-file-check text-gradient" style="font-size:1.5rem"></i><span>${name}</span>`;
    }
}

window.filterTable = function(inputEl, tableId) {
    const query = (inputEl.value || '').toLowerCase();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    let visible = 0;
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const show = text.includes(query);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    const tbody = document.querySelector(`#${tableId} tbody`);
    const emptyRow = tbody.querySelector('.empty-search-row');
    if (!visible && !emptyRow) {
        const tr = document.createElement('tr');
        tr.className = 'empty-search-row';
        const td = document.createElement('td');
        td.colSpan = 99;
        td.innerHTML = `<div class="empty-state"><i class="fas fa-search-minus"></i><h4>No results found</h4><p>Try a different search term.</p></div>`;
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else if (visible && emptyRow) {
        emptyRow.remove();
    }
};

window.setButtonLoading = function(btn, loading, text = '') {
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${text || 'Processing...'}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
};

window.showSuccessAnim = function(message = 'Done!') {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9998;pointer-events:none;`;
    el.innerHTML = `
        <div style="background:var(--bg-surface);border:1px solid rgba(16,185,129,0.3);
            border-radius:var(--radius-lg);padding:2.5rem 3rem;text-align:center;
            backdrop-filter:blur(20px);box-shadow:0 20px 40px rgba(0,0,0,0.4);
            animation:successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;">
            <div style="font-size:3.5rem;color:var(--success);margin-bottom:1rem;
                animation:successPop 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;">
                <i class="fas fa-check-circle"></i>
            </div>
            <p style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${message}</p>
        </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.remove(), 300);
    }, 1800);
};

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
};

document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});
