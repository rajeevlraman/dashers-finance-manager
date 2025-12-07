// ============================================================================
// 📁 importModal.js — Advanced Import Modal (CSV + Manual)
// ============================================================================

import { parseCSVFile, parseStatementText } from './importParser.js';
import { saveImportedTransactions } from './importSaver.js';
import { getAllItems, STORE_NAMES } from './db.js';
import { generateId } from './db.js';

// ============================================================================
// 🚀 EXPORT — THIS MUST EXIST!
// ============================================================================
export async function initImportModal() {
    console.log("📁 Import Modal: initImportModal() starting…");

    const accounts = await getAllItems(STORE_NAMES.accounts);

    // Inject modal into DOM once
    if (!document.getElementById("importModal")) {
        document.body.insertAdjacentHTML("beforeend", modalHTML(accounts));
        console.log("📁 Import Modal: HTML injected");
    }

    const modal = document.getElementById("importModal");
    const csvFile = document.getElementById("csvFile");
    const previewBox = document.getElementById("csvPreview");
    const previewSection = document.querySelector(".preview-section");

    // 🔄 OPEN / CLOSE MODAL
    document.getElementById("btnImportTx")?.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    document.getElementById("closeImportModal")?.addEventListener("click", () => {
        modal.style.display = "none";
    });

    document.getElementById("cancelImport")?.addEventListener("click", () => {
        modal.style.display = "none";
    });

    modal.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });

    // 📌 TAB SWITCHING
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            button.classList.add("active");
            document.getElementById(button.dataset.tab + "Tab").classList.add("active");
        });
    });

    // 🔍 CSV PREVIEW
    csvFile?.addEventListener("change", async () => {
        const file = csvFile.files[0];
        if (!file) return;

        const preview = await parseCSVFile(file, { previewOnly: true });
        previewBox.innerHTML = `<pre>${preview.join("\n")}</pre>`;
        previewSection.style.display = "block";
    });

    // 📥 FINAL IMPORT
    document.getElementById("processImport").addEventListener("click", async () => {
        const accountId = document.getElementById("importAccount").value;
        if (!accountId) {
            alert("Please select an account");
            return;
        }

        const activeTab = document.querySelector(".tab-btn.active").dataset.tab;

        let imported = [];

        if (activeTab === "csv") {
            const file = csvFile.files[0];
            if (!file) return alert("Please choose a CSV file");

            imported = await parseCSVFile(file, { previewOnly: false, accountId });

        } else if (activeTab === "manual") {
            const text = document.getElementById("statementText").value.trim();
            if (!text) return alert("Paste statement text first");

            imported = await parseStatementText(text, { accountId });
        }

        if (imported.length === 0) {
            alert("No valid transactions detected.");
            return;
        }

        const savedCount = await saveImportedTransactions(imported);
        alert(`📥 Imported ${savedCount} transactions`);

        modal.style.display = "none";
        location.reload();
    });
}



// ============================================================================
// 💠 Modal HTML Template
// ============================================================================
function modalHTML(accounts) {
return `
<div id="importModal" class="modal-overlay" 
     style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2000; justify-content:center; align-items:center;">

    <div class="modal-window" style="background:white; border-radius:10px; width:90%; max-width:650px; padding:20px;">

        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>📁 Import Transactions</h2>
            <button id="closeImportModal" style="border:none; background:none; font-size:1.4rem;">✕</button>
        </div>

        <div class="import-tabs" style="display:flex; gap:8px; margin-bottom:15px;">
            <button class="tab-btn active" data-tab="csv" style="padding:8px 16px;">CSV Import</button>
            <button class="tab-btn" data-tab="manual" style="padding:8px 16px;">Manual Paste</button>
        </div>

        <!-- CSV TAB -->
        <div id="csvTab" class="tab-content active">
            <label>Select CSV File</label>
            <input type="file" id="csvFile" accept=".csv,.txt" style="width:100%; margin-bottom:10px;">

            <label>Account</label>
            <select id="importAccount" style="width:100%; margin-bottom:10px;">
              <option value="">-- Select --</option>
              ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}
            </select>

            <div class="preview-section" style="display:none;">
                <h4>CSV Preview</h4>
                <div id="csvPreview" style="background:#f1f1f1; padding:10px; border-radius:6px; max-height:150px; overflow:auto;"></div>
            </div>
        </div>

        <!-- MANUAL TAB -->
        <div id="manualTab" class="tab-content" style="display:none;">
            <label>Paste Statement Text</label>
            <textarea id="statementText" style="width:100%; height:200px;"></textarea>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
            <button id="processImport" class="btn btn-primary">Import</button>
            <button id="cancelImport" class="btn btn-secondary">Cancel</button>
        </div>

    </div>
</div>
`;
}
