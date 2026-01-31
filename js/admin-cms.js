// Admin CMS script: loads JSON files from /data, editable in textarea, preview and download
(async function(){
  const dataRoot = 'data/';
  const fileListEl = document.getElementById('fileList');
  const editor = document.getElementById('editor');
  const fileName = document.getElementById('fileName');
  const filePath = document.getElementById('filePath');
  const preview = document.getElementById('preview');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadAllBtn = document.getElementById('downloadAll');
  const search = document.getElementById('fileSearch');
  const prettyBtn = document.getElementById('prettyBtn');
  const previewBtn = document.getElementById('previewBtn');

  // Hard-coded list of data files to manage (keeps security simple for static sites)
  const files = [
    'site/nav.json',
    'site/footer.json',
    'site/site.json',
    'assets/images.json',
    'pages/index.json',
    'pages/about.json',
    'pages/classes.json',
    'pages/team.json',
    'pages/contact.json',
    'pages/books.json'
  ];

  let current = null;
  const fileDataCache = {};

  function renderFileList(filter=''){
    fileListEl.innerHTML = '';
    files.filter(f=>f.includes(filter)).forEach(f=>{
      const div = document.createElement('div');
      div.className = 'file-item';
      div.textContent = f;
      div.title = f;
      div.addEventListener('click', ()=>openFile(f, div));
      fileListEl.appendChild(div);
    });
  }

  renderFileList();
  search.addEventListener('input', ()=>renderFileList(search.value.trim()));

  async function fetchJson(path){
    try{
      const res = await fetch(dataRoot + path + '?_=' + Date.now());
      if(!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      return json;
    }catch(e){
      return null;
    }
  }

  async function openFile(path, el){
    // clear active
    document.querySelectorAll('.file-item').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    current = path;
    fileName.textContent = path.split('/').pop();
    filePath.textContent = dataRoot + path;

    let data = fileDataCache[path];
    if(!data){
      data = await fetchJson(path);
      fileDataCache[path] = data;
    }
    if(data===null){
      editor.value = '{\n  "error": "Unable to load file. When using the file:// protocol some browsers block fetch(). Run a local HTTP server to use the CMS."\n}';
      preview.innerHTML = '<p class="warn">Cannot preview — file fetch failed.</p>';
      return;
    }
    editor.value = JSON.stringify(data, null, 2);
    renderPreview(data);
  }

  function renderPreview(data){
    // Simple preview: display structured content based on type
    preview.innerHTML = '';
    if(!data) { preview.textContent = 'No data'; return; }
    if(Array.isArray(data)){
      const ul = document.createElement('ul');
      data.forEach(item=>{ const li = document.createElement('li'); li.textContent = JSON.stringify(item); ul.appendChild(li); });
      preview.appendChild(ul); return;
    }
    // pages/books.json special render
    if(current && current.endsWith('pages/books.json')){
      const h = document.createElement('h3'); h.textContent = data.title || 'Books'; preview.appendChild(h);
      if(data.books && Array.isArray(data.books)){
        data.books.forEach(b => {
          const card = document.createElement('div');
          card.style.padding='8px';card.style.borderBottom='1px solid #eee';
          const t = document.createElement('div'); t.innerHTML = `<strong>${b.title}</strong> <span style="color:#6b7280">${b.class||''}</span>`;
          const p = document.createElement('div'); p.textContent = b.description||'';
          const link = document.createElement('a'); link.href = b.pdfUrl||'#'; link.textContent='Open'; link.target='_blank'; link.style.marginRight='8px';
          card.appendChild(t); card.appendChild(p); card.appendChild(link);
          preview.appendChild(card);
        });
        return;
      }
    }
    // generic object display
    const pre = document.createElement('pre'); pre.textContent = JSON.stringify(data, null, 2); preview.appendChild(pre);
  }

  prettyBtn.addEventListener('click', ()=>{
    try{ const j = JSON.parse(editor.value); editor.value = JSON.stringify(j, null, 2); }catch(e){ alert('Invalid JSON'); }
  });

  previewBtn.addEventListener('click', ()=>{
    try{ const j = JSON.parse(editor.value); renderPreview(j); }catch(e){ alert('Invalid JSON'); }
  });

  downloadBtn.addEventListener('click', ()=>{
    if(!current){ alert('Select a file first'); return; }
    try{
      const data = JSON.parse(editor.value);
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = current.split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }catch(e){ alert('Invalid JSON'); }
  });

  downloadAllBtn.addEventListener('click', async ()=>{
    // fetch all files and create a zip-like single JSON bundle for download
    const bundle = {};
    for(const f of files){
      const j = await fetchJson(f);
      bundle[f] = j;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'site-json-bundle.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // auto-open first file
  (document.querySelectorAll('.file-item')[0]||{click:()=>{}}).click();
})();