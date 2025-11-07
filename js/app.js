import { Storage } from './store.js';

const newBtn = document.getElementById('newRecipeBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const form = document.getElementById('recipeForm');
const listEl = document.getElementById('recipeList');
const tpl = document.getElementById('recipeItemTpl');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const authorFilter = document.getElementById('authorFilter');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAllBtn');
const clearFilters = document.getElementById('clearFilters');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

let items = Storage.load();

// Utilities
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function formatDate(s){ if(!s) return ''; try { return new Date(s).toLocaleDateString(); } catch { return s; } }
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Rendering
function renderList(filterText = '') {
  listEl.innerHTML = '';
  const tag = tagFilter.value;
  const author = authorFilter.value;
  const q = filterText.trim().toLowerCase();

  const filtered = items.filter(r => {
    if(tag && !r.tags?.split(',').map(t=>t.trim().toLowerCase()).includes(tag.toLowerCase())) return false;
    if(author && (r.author || '').toLowerCase() !== author.toLowerCase()) return false;
    if(!q) return true;
    const hay = (r.title + ' ' + (r.ingredients||'') + ' ' + (r.directions||'') + ' ' + (r.notes||'')).toLowerCase();
    return hay.includes(q);
  });

  filtered.forEach(r => {
    const node = tpl.content.cloneNode(true);
    const li = node.querySelector('li');
    node.querySelector('.recipe-title').textContent = r.title;
    node.querySelector('.author').textContent = r.author || 'Unknown';
    node.querySelector('.date').textContent = formatDate(r.date);
    const thumb = node.querySelector('.thumb');
    if(r.photo){
      thumb.src = r.photo;
      thumb.classList.remove('hide');
      thumb.alt = `${r.title} photo`;
    }
    const excerpt = node.querySelector('.excerpt');
    excerpt.textContent = (r.ingredients || '').split('\n').slice(0,3).join(', ');
    node.querySelector('.tags').textContent = r.tags || '';
    node.querySelector('.viewBtn').addEventListener('click', () => openView(r.id));
    node.querySelector('.editBtn').addEventListener('click', () => openEdit(r.id));
    node.querySelector('.printBtn').addEventListener('click', () => printCard(r.id));
    listEl.appendChild(li);
  });

  refreshFilters();
}

function refreshFilters(){
  const tags = new Set();
  const authors = new Set();
  items.forEach(r => {
    (r.tags || '').split(',').map(t=>t.trim()).filter(Boolean).forEach(t => tags.add(t));
    if(r.author) authors.add(r.author);
  });

  updateSelect(tagFilter, ['', ...Array.from(tags)]);
  updateSelect(authorFilter, ['', ...Array.from(authors)]);
}

function updateSelect(select, values){
  const cur = select.value;
  select.innerHTML = '';
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All';
    select.appendChild(opt);
  });
  if(Array.from(select.options).some(o=>o.value === cur)) select.value = cur;
}

// Modal and form
function openModal(mode='new', data = {}) {
  modal.classList.remove('hide');
  document.getElementById('modalTitle').textContent = mode === 'new' ? 'New Recipe' : 'Edit Recipe';
  deleteRecipeBtn.classList.toggle('hide', mode === 'new');
  form.elements.id.value = data.id || '';
  form.elements.title.value = data.title || '';
  form.elements.author.value = data.author || '';
  form.elements.date.value = data.date || '';
  form.elements.tags.value = data.tags || '';
  form.elements.ingredients.value = data.ingredients || '';
  form.elements.directions.value = data.directions || '';
  form.elements.notes.value = data.notes || '';
  focusFirstInputInModal();
}
function closeModalWindow(){
  modal.classList.add('hide');
  form.reset();
}

// focus slight delay for mobile keyboards
function focusFirstInputInModal() {
  setTimeout(() => {
    const first = modal.querySelector('input[name="title"], input, textarea');
    if (first) {
      try { first.focus(); } catch (e) {}
    }
  }, 220);
}

// CRUD
function openEdit(id){
  const r = items.find(x=>x.id===id);
  if(!r) return;
  openModal('edit', r);
}
function openView(id){
  const r = items.find(x=>x.id===id);
  if(!r) return;
  const w = window.open('', '_blank', 'width=700,height=800');
  const photoHtml = r.photo ? `<img style="max-width:100%;height:auto;border-radius:6px;margin:.5rem 0" src="${r.photo}" alt="${escapeHtml(r.title)}">` : '';
  w.document.write(`<html><head><meta charset="utf-8"/><title>${escapeHtml(r.title)}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{margin-top:0}pre{white-space:pre-wrap;font-family:inherit}button{padding:.4rem .6rem;border-radius:6px;border:1px solid #888;background:#eee;cursor:pointer}</style></head><body><button onclick="window.print()">Print</button><h1>${escapeHtml(r.title)}</h1><p><strong>By:</strong> ${escapeHtml(r.author || 'Unknown')} ${r.date? '· ' + escapeHtml(formatDate(r.date)) : ''}</p>${photoHtml}<h2>Ingredients</h2><pre>${escapeHtml(r.ingredients || '')}</pre><h2>Directions</h2><pre>${escapeHtml(r.directions || '')}</pre><h3>Notes</h3><p>${escapeHtml(r.notes || '')}</p></body></html>`);
  w.document.close();
}

// Form submit
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const id = fd.get('id') || uid();
  const photoFile = form.elements.photo.files[0];
  let photoData = null;
  if(photoFile){
    photoData = await readFileAsDataURL(photoFile);
  } else {
    const existing = items.find(x => x.id === id);
    photoData = existing ? existing.photo : null;
  }

  const record = {
    id,
    title: fd.get('title').trim(),
    author: fd.get('author').trim(),
    date: fd.get('date') || null,
    tags: fd.get('tags').trim(),
    ingredients: fd.get('ingredients').trim(),
    directions: fd.get('directions').trim(),
    notes: fd.get('notes').trim(),
    photo: photoData
  };

  const idx = items.findIndex(x => x.id === id);
  if(idx >= 0) items[idx] = record; else items.unshift(record);
  Storage.save(items);
  renderList(searchInput.value);
  closeModalWindow();
});

function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

newBtn.addEventListener('click', () => openModal('new'));
closeModal.addEventListener('click', closeModalWindow);
modal.addEventListener('click', e => { if(e.target === modal) closeModalWindow(); });

// Search & filters
searchInput.addEventListener('input', () => renderList(searchInput.value));
tagFilter.addEventListener('change', () => renderList(searchInput.value));
authorFilter.addEventListener('change', () => renderList(searchInput.value));
clearFilters.addEventListener('click', () => { tagFilter.value=''; authorFilter.value=''; renderList(''); });

// Export / Import / Clear
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(items, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'family-recipes.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const text = await f.text();
  try {
    const imported = JSON.parse(text);
    if(Array.isArray(imported)) {
      const map = new Map(items.map(x=>[x.id,x]));
      imported.forEach(r => map.set(r.id || uid(), r));
      items = Array.from(map.values());
      Storage.save(items);
      renderList();
    } else {
      alert('Imported file must be a JSON array of recipes.');
    }
  } catch (err) {
    alert('Invalid JSON file.');
  } finally {
    e.target.value = '';
  }
});

clearAllBtn.addEventListener('click', () => {
  if(confirm('Delete all recipes from this browser? This cannot be undone.')) {
    items = [];
    Storage.clear();
    renderList();
  }
});

deleteRecipeBtn.addEventListener('click', () => {
  const id = form.elements.id.value;
  if(!id) return;
  if(confirm('Delete this recipe?')) {
    items = items.filter(r=>r.id!==id);
    Storage.save(items);
    closeModalWindow();
    renderList();
  }
});

// PRINT: build print HTML for a single 3x5 card and open it in a new window
function getPrintCss() {
  return `
    @page { size: 3in 5in; margin: 0; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
    .print-card { box-sizing: border-box; width: 3in; height: 5in; padding: 0.35in; color: #111; background: #fff; display:flex; flex-direction:column; gap:0.3rem; }
    .print-card h1 { font-size: 1.1rem; margin:0; line-height:1.05; }
    .print-meta { font-size:0.75rem; color:#666; }
    .print-photo { width:100%; height:1.3in; object-fit:cover; border-radius:4px; display:block; }
    .print-section-title { font-weight:600; font-size:0.85rem; margin-top:0.25rem; }
    .print-ingredients, .print-directions { font-size:0.78rem; overflow:hidden; }
    .print-notes { font-size:0.7rem; color:#444; margin-top:auto; }
  `;
}

function buildPrintHtml(r) {
  const photoHtml = r.photo ? `<img class="print-photo" src="${r.photo}" alt="${escapeHtml(r.title)}">` : '';
  const ingredientsHtml = (r.ingredients || '').split('\n').map(line => `<div>${escapeHtml(line)}</div>`).join('');
  const directionsHtml = (r.directions || '').split('\n').map(line => `<div>${escapeHtml(line)}</div>`).join('');
  const notesHtml = escapeHtml(r.notes || '');
  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>${escapeHtml(r.title)}</title>
    <style>${getPrintCss()}</style>
  </head>
  <body>
    <div class="print-card" role="article" aria-label="${escapeHtml(r.title)}">
      <h1>${escapeHtml(r.title)}</h1>
      <div class="print-meta"><strong>${escapeHtml(r.author || 'Unknown')}</strong>${r.date ? ' · ' + escapeHtml(formatDate(r.date)) : ''}</div>
      ${photoHtml}
      <div class="print-section">
        <div class="print-section-title">Ingredients</div>
        <div class="print-ingredients">${ingredientsHtml}</div>
      </div>
      <div class="print-section">
        <div class="print-section-title">Directions</div>
        <div class="print-directions">${directionsHtml}</div>
      </div>
      <div class="print-notes">${notesHtml}</div>
    </div>
    <script>window.onload = () => { setTimeout(()=>{ window.print(); }, 120); };</script>
  </body>
  </html>`;
}

function printCard(id) {
  const r = items.find(x => x.id === id);
  if(!r) return;
  const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
  w.document.write(buildPrintHtml(r));
  w.document.close();
}

// Initialize
renderList();
