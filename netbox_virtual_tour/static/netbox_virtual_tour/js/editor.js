/*
 * Virtual Tour Editor
 * Dependencies: PhotoSphereViewer UMD globals, Bootstrap 5, window.TOUR_CONFIG
 */
(function () {
  'use strict';

  const { Viewer } = PhotoSphereViewer;
  const { MarkersPlugin } = PhotoSphereViewer;
  const cfg = window.TOUR_CONFIG;

  const state = {
    tour: null,
    selectedSceneId: null,
    psvViewer: null,
    psvMarkers: null,
    pendingLinkPosition: null,
    compassAiming: false,
    defaultViewAiming: false,
    linkAiming: false,
    pendingLinkTarget: null,
    livePreviewLinkId: null,
  };

  // ---- helpers ----
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function toast(msg, isError) {
    const el = document.createElement('div');
    el.className = 'editor-toast' + (isError ? ' error' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }

  async function api(url, opts) {
    opts = opts || {};
    const headers = opts.headers || {};
    headers['X-CSRFToken'] = cfg.csrfToken;
    if (opts.jsonBody) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.jsonBody);
      delete opts.jsonBody;
    }
    const resp = await fetch(url, Object.assign({}, opts, { headers: headers }));
    if (!resp.ok) {
      let msg = 'Request failed (' + resp.status + ')';
      try { const d = await resp.json(); if (d.error) msg = d.error; } catch (_) {}
      throw new Error(msg);
    }
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) return resp.json();
    return resp;
  }

  function showProgress(label) {
    qs('#upload-progress').classList.remove('d-none');
    qs('#upload-progress-label').textContent = label || 'Uploading\u2026';
  }
  function hideProgress() { qs('#upload-progress').classList.add('d-none'); }

  function getScene(id) {
    return state.tour.scenes.find(function (s) { return String(s.id) === String(id); });
  }

  // ---- modal ----
    function showLinkPicker() { qs('#linkPickerOverlay').style.display = ''; }
    function hideLinkPicker() { qs('#linkPickerOverlay').style.display = 'none'; }

  // ---- init ----
  async function init() {
    state.tour = await api(cfg.dataUrl);
    renderAll();
    bindGlobalEvents();
  }

  function renderAll() {
    renderFloorplan();
    renderSceneList();
    renderSceneEditor();
    updateStatusPill();
  }

  // ---- cone SVG ----
  // Builds the SVG element for the directional cone on the floorplan marker.
  // The cone always points "up" in local space; the parent marker's CSS
  // transform:rotate() turns the whole thing to reflect floorplan_rotation.
  function makeConesvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-24 -24 48 48');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.className = 'marker-cone';
    // Cone: a pie-slice pointing up, ~80° wide
    const cone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Arc from -40° to +40° (relative to -90° = up), radius 22
    const r = 22;
    const half = 40 * Math.PI / 180;
    const x1 = Math.cos(-Math.PI/2 - half) * r;
    const y1 = Math.sin(-Math.PI/2 - half) * r;
    const x2 = Math.cos(-Math.PI/2 + half) * r;
    const y2 = Math.sin(-Math.PI/2 + half) * r;
    cone.setAttribute('d', `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
    cone.className = 'cone-fill';
    svg.appendChild(cone);
    return svg;
  }

  // ---- floorplan ----
  function renderFloorplan() {
    const canvas = qs('#floorplan-canvas');
    const placeholder = qs('#floorplan-placeholder');

    qsa('.scene-marker').forEach(function (m) { m.remove(); });
    const existingImg = canvas.querySelector('img.floorplan-img');
    if (existingImg) existingImg.remove();

    if (!state.tour.floorplan_url) {
      qs('#floorplan-status').textContent = 'No floorplan uploaded.';
      if (state.tour.scenes.length > 0) {
        if (placeholder) placeholder.style.display = 'none';
        canvas.style.minHeight = '120px';
        state.tour.scenes.forEach(function (scene) { placeMarker(scene); });
      } else {
        if (placeholder) placeholder.style.display = '';
      }
      return;
    }

    if (placeholder) placeholder.style.display = 'none';
    qs('#floorplan-status').textContent =
      'Loaded (' + state.tour.floorplan_width + '\xd7' + state.tour.floorplan_height + ')';

    const img = document.createElement('img');
    img.className = 'floorplan-img';
    img.src = state.tour.floorplan_url;
    img.draggable = false;
    canvas.insertBefore(img, canvas.firstChild);

    function afterLoad() {
      state.tour.scenes.forEach(function (scene) { placeMarker(scene); });
    }
    if (img.complete) { afterLoad(); } else { img.addEventListener('load', afterLoad); }
  }

  function placeMarker(scene) {
    const canvas = qs('#floorplan-canvas');
    const existing = canvas.querySelector('.scene-marker[data-scene-id="' + scene.id + '"]');
    if (existing) existing.remove();

    const idx = state.tour.scenes.indexOf(scene) + 1;
    const marker = document.createElement('div');
    marker.className = 'scene-marker';
    if (scene.floorplan_rotation) marker.classList.add('compass-set');
    marker.dataset.sceneId = scene.id;
    marker.title = scene.name;
    if (String(state.selectedSceneId) === String(scene.id)) marker.classList.add('active');

    // Direction cone SVG — a filled triangle pointing up that rotates
    // with the marker to show which way the photo faces on the floorplan.
    marker.innerHTML =
      '<svg class="marker-cone" viewBox="-10 -18 20 18" xmlns="http://www.w3.org/2000/svg">' +
        '<polygon points="0,-16 -7,-2 7,-2" fill="rgba(13,110,253,0.85)" />' +
      '</svg>' +
      '<div class="marker-body">' + idx + '</div>';

    positionMarker(marker, scene);

    marker.addEventListener('click', function (e) {
      e.stopPropagation();
      selectScene(scene.id);
    });
    attachDragHandlers(marker, scene);
    canvas.appendChild(marker);
  }

  // (old makeConesvg alias removed)

  function positionMarker(marker, scene) {
    const canvas = qs('#floorplan-canvas');
    const img = canvas.querySelector('img.floorplan-img');
    if (img) {
      const ir = img.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      marker.style.left = ((ir.left - cr.left) + scene.floorplan_x * ir.width) + 'px';
      marker.style.top  = ((ir.top  - cr.top)  + scene.floorplan_y * ir.height) + 'px';
    } else {
      const i = state.tour.scenes.indexOf(scene);
      const n = state.tour.scenes.length;
      const pct = n > 1 ? (i / (n - 1)) * 0.8 + 0.1 : 0.5;
      marker.style.left = (pct * 100) + '%';
      marker.style.top = '50%';
    }
    // Rotate the whole marker (body + cone) to reflect floorplan_rotation
    marker.style.transform = 'rotate(' + (scene.floorplan_rotation || 0) + 'deg)';
  }

  function updateMarkerRotation(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return;
    const marker = qs('.scene-marker[data-scene-id="' + sceneId + '"]');
    if (!marker) return;
    marker.style.transform = 'rotate(' + (scene.floorplan_rotation || 0) + 'deg)';
    if (scene.floorplan_rotation) {
      marker.classList.add('compass-set');
    } else {
      marker.classList.remove('compass-set');
    }
  }

  function attachDragHandlers(marker, scene) {
    let dragging = false, ox = 0, oy = 0;
    marker.addEventListener('pointerdown', function (e) {
      dragging = true;
      marker.classList.add('dragging');
      marker.setPointerCapture(e.pointerId);
      const r = marker.getBoundingClientRect();
      ox = e.clientX - (r.left + r.width / 2);
      oy = e.clientY - (r.top + r.height / 2);
      e.preventDefault();
    });
    marker.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const img = qs('#floorplan-canvas').querySelector('img.floorplan-img');
      if (!img) return;
      const r = img.getBoundingClientRect();
      scene.floorplan_x = Math.max(0, Math.min(1, (e.clientX - ox - r.left) / r.width));
      scene.floorplan_y = Math.max(0, Math.min(1, (e.clientY - oy - r.top) / r.height));
      positionMarker(marker, scene);
    });
    marker.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      marker.classList.remove('dragging');
      marker.releasePointerCapture(e.pointerId);
      persistScene(scene, ['floorplan_x', 'floorplan_y']).catch(function (err) { toast(err.message, true); });
    });
  }

  // ---- scene list ----
  function renderSceneList() {
    const list = qs('#scene-list');
    const empty = qs('#scene-list-empty');
    list.innerHTML = '';
    if (!state.tour.scenes.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    state.tour.scenes.forEach(function (scene, idx) {
      const li = document.createElement('li');
      li.dataset.sceneId = scene.id;
      if (String(state.selectedSceneId) === String(scene.id)) li.classList.add('active');
      li.innerHTML =
        '<img class="scene-thumb" src="' + scene.photo_url + '" alt="">' +
        '<span>' + (idx + 1) + '. ' + scene.name + '</span>';
      li.addEventListener('click', function () { selectScene(scene.id); });
      list.appendChild(li);
    });
  }

  function selectScene(sceneId) {
    state.selectedSceneId = sceneId;
    // Cancel any in-progress compass aiming when switching scenes
    if (state.compassAiming) cancelCompassAim();
    if (state.defaultViewAiming) cancelDefaultViewAim();
    renderSceneList();
    renderSceneEditor();
    qsa('.scene-marker').forEach(function (m) {
      m.classList.toggle('active', String(m.dataset.sceneId) === String(sceneId));
    });
  }

  // ---- PSV editor ----
  function renderSceneEditor() {
    const section = qs('#scene-editor-section');
    if (!state.selectedSceneId) { section.style.display = 'none'; destroyPsv(); return; }
    const scene = getScene(state.selectedSceneId);
    if (!scene) return;

    section.style.display = '';
    qs('#scene-editor-name').textContent = scene.name;
    destroyPsv();

    state.psvViewer = new Viewer({
      container: qs('#psv-editor'),
      panorama: scene.photo_url,
      defaultYaw: scene.default_yaw,
      defaultPitch: scene.default_pitch,
      navbar: ['zoom', 'move', 'fullscreen'],
      plugins: [MarkersPlugin],
    });
    state.psvMarkers = state.psvViewer.getPlugin(MarkersPlugin);
    state.psvViewer.addEventListener('ready', refreshLinkMarkers, { once: true });
    renderLinkList();
    updateCompassButton();
  }

    function destroyPsv() {
      cancelLinkAim();
      cancelCompassAim();
      if (state.defaultViewAiming) cancelDefaultViewAim();
      if (state.psvViewer) { state.psvViewer.destroy(); state.psvViewer = null; state.psvMarkers = null; }
    }

  function refreshLinkMarkers() {
    if (!state.psvMarkers) return;
    state.psvMarkers.clearMarkers();
    const scene = getScene(state.selectedSceneId);
    if (!scene) return;
    scene.links.forEach(function (link, idx) {
      const target = getScene(link.to_scene_id);
      state.psvMarkers.addMarker({
        id: 'link-' + idx,
        position: { yaw: link.yaw, pitch: link.pitch },
        html: '<div class="psv-link-marker">\u2192 ' + (target ? target.name : '?') + '</div>',
        anchor: 'center center',
        tooltip: target ? target.name : 'Unknown',
      });
    });
  }

  // ---- Compass direction flow ----
  // The editor clicks "Set Compass Direction". The button turns amber and
  // the PSV pane gets an instructional overlay. The editor pans until they're
  // facing the direction that is "up" on the floorplan, then clicks the
  // now-amber button again (which reads "Confirm Direction"). We capture the
  // current yaw and store it as floorplan_rotation.

  function startCompassAim() {
    state.compassAiming = true;
    const btn = qs('#btn-set-compass');
    btn.textContent = 'Confirm Direction';
    btn.classList.add('aiming');
    qs('#compass-aim-overlay').style.display = '';
  }

  function cancelCompassAim() {
    state.compassAiming = false;
    updateCompassButton();
    qs('#compass-aim-overlay').style.display = 'none';
  }

  function updateCompassButton() {
    const btn = qs('#btn-set-compass');
    if (!btn) return;
    btn.textContent = 'Set Compass Direction';
    btn.classList.remove('aiming');
  }

  async function handleCompassClick() {
    if (!state.compassAiming) {
      startCompassAim();
      return;
    }
    if (!state.psvViewer) { cancelCompassAim(); return; }

    // The user is facing the direction they want to be "up" on the floorplan.
    // PSV yaw in radians, increasing clockwise from photo centre.
    // Map plugin draws cone at angle (yaw + rotation), so cone points "up"
    // on canvas when (yaw + rotation) = 0.
    // We want cone to point up when user faces this direction D:
    //   D + rotation = 0  →  rotation = -D
    // We store floorplan_rotation as positive yaw degrees (intuitive for the
    // marker arrow on the floorplan), and negate it in the viewer's rotationRad().
    const pos = state.psvViewer.getPosition();
    const yawDeg = ((pos.yaw * 180 / Math.PI) % 360 + 360) % 360;

    const scene = getScene(state.selectedSceneId);
    scene.floorplan_rotation = yawDeg;

    cancelCompassAim();
    updateMarkerRotation(scene.id);
    await persistScene(scene, ['floorplan_rotation']);
    toast('Compass set — the minimap cone will track your view correctly');
  }

  // ---- toolbar actions ----
    function startDefaultViewAim() {
      state.defaultViewAiming = true;
      const btn = qs('#btn-set-default-view');
      btn.textContent = 'Confirm View';
      btn.classList.add('aiming');
      qs('#default-view-aim-overlay').style.display = '';
    }

    function cancelDefaultViewAim() {
      state.defaultViewAiming = false;
      const btn = qs('#btn-set-default-view');
      if (btn) {
        btn.textContent = 'Set Default View';
        btn.classList.remove('aiming');
      }
      const ov = qs('#default-view-aim-overlay');
      if (ov) ov.style.display = 'none';
    }

    async function handleDefaultViewClick() {
      if (!state.defaultViewAiming) {
        // Cancel compass aim if active
        if (state.compassAiming) cancelCompassAim();
        if (state.defaultViewAiming) cancelDefaultViewAim();
        startDefaultViewAim();
        return;
      }
      if (!state.psvViewer) { cancelDefaultViewAim(); return; }
      const scene = getScene(state.selectedSceneId);
      if (!scene) { cancelDefaultViewAim(); return; }
      const pos = state.psvViewer.getPosition();
      scene.default_yaw = pos.yaw;
      scene.default_pitch = pos.pitch;
      cancelDefaultViewAim();
      await persistScene(scene, ['default_yaw', 'default_pitch']);
      toast('Default view saved');
    }

    // Step 1: open the picker (destination + optional label)
    function addLinkAtCurrentView() {
      const scene = getScene(state.selectedSceneId);
      if (!scene || !state.psvViewer) return;
      if (state.compassAiming) cancelCompassAim();
      if (state.defaultViewAiming) cancelDefaultViewAim();
      if (state.linkAiming) cancelLinkAim();

      const others = state.tour.scenes.filter(function (s) {
        return String(s.id) !== String(scene.id);
      });
      if (!others.length) { toast('Add another scene first', true); return; }

      qs('#link-label-input').value = '';
      const list = qs('#link-picker-list');
      list.innerHTML = '';
      others.forEach(function (s) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'list-group-item list-group-item-action';
        btn.textContent = s.name;
        btn.addEventListener('click', function () {
          const label = (qs('#link-label-input').value || '').trim();
          hideLinkPicker();
          startLinkAim(s.id, s.name, label);
        });
        list.appendChild(btn);
      });
      showLinkPicker();
    }

    // Step 2: enter aim mode — show a live arrow that follows the camera direction
    function startLinkAim(targetSceneId, targetName, label) {
      state.linkAiming = true;
      state.pendingLinkTarget = { to_scene_id: targetSceneId, name: targetName, label: label };

      const btn = qs('#btn-add-link');
      btn.textContent = 'Confirm Link Position';
      btn.classList.add('aiming');
      qs('#link-aim-overlay').style.display = '';

      // Add a live-preview marker at the current camera centre
      if (state.psvMarkers) {
        state.livePreviewLinkId = 'link-preview';
        const pos = state.psvViewer.getPosition();
        state.psvMarkers.addMarker({
          id: state.livePreviewLinkId,
          position: { yaw: pos.yaw, pitch: pos.pitch },
          html: '<div class="psv-link-marker" style="background:rgba(32,201,151,0.95);">\u2192 ' + targetName + '</div>',
          anchor: 'center center',
        });
        // Move the marker every time the camera moves so it appears centred
        state.psvViewer.addEventListener('position-updated', linkAimPositionListener);
      }
    }

// Listener that re-positions the live preview marker as the camera pans
function linkAimPositionListener(e) {
  if (!state.linkAiming || !state.psvMarkers || !state.livePreviewLinkId) return;
  state.psvMarkers.updateMarker({
    id: state.livePreviewLinkId,
    position: { yaw: e.position.yaw, pitch: e.position.pitch },
  });
}

function cancelLinkAim() {
  state.linkAiming = false;
  state.pendingLinkTarget = null;
  const btn = qs('#btn-add-link');
  if (btn) {
    btn.textContent = 'Add Link Here';
    btn.classList.remove('aiming');
  }
  const ov = qs('#link-aim-overlay');
  if (ov) ov.style.display = 'none';
  if (state.psvViewer) {
    try { state.psvViewer.removeEventListener('position-updated', linkAimPositionListener); } catch (_) {}
  }
  if (state.psvMarkers && state.livePreviewLinkId) {
    try { state.psvMarkers.removeMarker(state.livePreviewLinkId); } catch (_) {}
  }
  state.livePreviewLinkId = null;
}

// Step 3: confirm — save link with current camera position
async function confirmLinkPlacement() {
  if (!state.linkAiming || !state.psvViewer || !state.pendingLinkTarget) {
    cancelLinkAim();
    return;
  }
  const scene = getScene(state.selectedSceneId);
  if (!scene) { cancelLinkAim(); return; }
  const pos = state.psvViewer.getPosition();
  const target = state.pendingLinkTarget;

  try {
    const result = await api(cfg.urls.linkCreateBase + scene.id + '/link/', {
      method: 'POST',
      jsonBody: {
        to_scene_id: target.to_scene_id,
        yaw: pos.yaw, pitch: pos.pitch,
        label: target.label || '',
      },
    });
    scene.links = scene.links.filter(function (l) {
      return String(l.to_scene_id) !== String(target.to_scene_id);
    });
    scene.links.push({
      _id: result.id, to_scene_id: target.to_scene_id,
      yaw: pos.yaw, pitch: pos.pitch, label: target.label || '',
    });
    cancelLinkAim();           // tears down preview marker
    refreshLinkMarkers();      // adds the saved one
    renderLinkList();
    toast('Link added' + (target.label ? ': \u201c' + target.label + '\u201d' : ''));
  } catch (err) {
    toast(err.message, true);
    cancelLinkAim();
  }
}

  async function renameScene() {
    const scene = getScene(state.selectedSceneId);
    if (!scene) return;
    const name = window.prompt('Scene name:', scene.name);
    if (!name || !name.trim()) return;
    scene.name = name.trim();
    await persistScene(scene, ['name']);
    renderSceneList();
    qs('#scene-editor-name').textContent = scene.name;
    const m = qs('.scene-marker[data-scene-id="' + scene.id + '"]');
    if (m) m.title = scene.name;
    toast('Renamed');
  }

  async function deleteSelectedScene() {
    const scene = getScene(state.selectedSceneId);
    if (!scene) return;
    if (!window.confirm('Delete scene "' + scene.name + '"? This cannot be undone.')) return;
    await api(cfg.urls.sceneDetailBase + scene.id + '/delete/', { method: 'POST' });
    state.tour.scenes = state.tour.scenes.filter(function (s) { return String(s.id) !== String(scene.id); });
    state.tour.scenes.forEach(function (s) {
      s.links = s.links.filter(function (l) { return String(l.to_scene_id) !== String(scene.id); });
    });
    state.selectedSceneId = null;
    renderAll();
    toast('Scene deleted');
  }

  function renderLinkList() {
    const ul = qs('#link-list');
    ul.innerHTML = '';
    const scene = getScene(state.selectedSceneId);
    if (!scene) return;
    if (!scene.links.length) {
      ul.innerHTML = '<li style="list-style:none;padding:0.4rem 0" class="text-muted small">No links yet. Pan to a doorway and click "Add Link Here".</li>';
      return;
    }
    scene.links.forEach(function (link, idx) {
      const target = getScene(link.to_scene_id);
      const li = document.createElement('li');
      li.innerHTML =
        '<span>\u2192 <strong>' + (target ? target.name : '?') + '</strong>' +
        (link.label ? ' <span class="text-muted small">(' + link.label + ')</span>' : '') + '</span>' +
        '<button class="btn btn-sm btn-outline-danger" data-idx="' + idx + '">Remove</button>';
      li.querySelector('button').addEventListener('click', async function () {
        if (!link._id) { state.tour = await api(cfg.dataUrl); renderAll(); return; }
        try {
          await api(cfg.urls.linkDeleteBase + link._id + '/delete/', { method: 'POST' });
          scene.links.splice(idx, 1);
          refreshLinkMarkers();
          renderLinkList();
        } catch (err) { toast(err.message, true); }
      });
      ul.appendChild(li);
    });
  }

  async function persistScene(scene, fields) {
    const payload = {};
    fields.forEach(function (f) { payload[f] = scene[f]; });
    await api(cfg.urls.sceneDetailBase + scene.id + '/', { method: 'POST', jsonBody: payload });
  }

  function updateStatusPill() {
    const pill = qs('#status-pill');
    if (state.tour.status === 'published') {
      pill.textContent = 'Published'; pill.className = 'badge bg-success ms-2';
    } else {
      pill.textContent = 'Draft'; pill.className = 'badge bg-secondary ms-2';
    }
  }

  async function publishTour() {
    if (!window.confirm('Publish? Viewers will immediately see your changes.')) return;
    await api(cfg.urls.publish, { method: 'POST' });
    state.tour.status = 'published';
    updateStatusPill();
    toast('Published!');
  }

  async function deleteTour() {
    if (!window.confirm('Delete this entire tour? This cannot be undone.')) return;
    const result = await api(cfg.urls.deleteTour, { method: 'POST' });
    window.location.href = result.redirect || '/';
  }

  // ---- global events ----
  function bindGlobalEvents() {
    qs('#floorplan-upload').addEventListener('change', async function (e) {
      const file = e.target.files[0]; if (!file) return;
      showProgress('Uploading floorplan\u2026');
      try {
        const fd = new FormData(); fd.append('floorplan', file);
        const result = await api(cfg.urls.floorplan, { method: 'POST', body: fd });
        state.tour.floorplan_url = result.floorplan_url + '?t=' + Date.now();
        state.tour.floorplan_width = result.floorplan_width;
        state.tour.floorplan_height = result.floorplan_height;
        renderFloorplan();
        toast('Floorplan uploaded');
      } catch (err) { toast(err.message, true); }
      finally { hideProgress(); e.target.value = ''; }
    });

    qs('#scene-upload').addEventListener('change', async function (e) {
      const file = e.target.files[0]; if (!file) return;
      showProgress('Uploading \u201c' + file.name + '\u201d\u2026');
      try {
        const fd = new FormData();
        fd.append('photo', file);
        fd.append('name', file.name.replace(/\.[^/.]+$/, ''));
        const scene = await api(cfg.urls.sceneCreate, { method: 'POST', body: fd });
        state.tour.scenes.push(scene);
        renderSceneList();
        renderFloorplan();
        selectScene(scene.id);
        toast('Scene added: ' + scene.name);
      } catch (err) { toast(err.message, true); }
      finally { hideProgress(); e.target.value = ''; }
    });
    qs('#btn-add-link').addEventListener('click', function () {
      if (state.linkAiming) {
        confirmLinkPlacement().catch(function (err) { toast(err.message, true); });
      } else {
        addLinkAtCurrentView();
      }
    });
    qs('#btn-set-default-view').addEventListener('click', function () {
      handleDefaultViewClick().catch(function (err) { toast(err.message, true); });
    });
    qs('#btn-set-compass').addEventListener('click', function () {
      handleCompassClick().catch(function (err) { toast(err.message, true); });
    });

    qs('#btn-rename-scene').addEventListener('click', function () {
      renameScene().catch(function (err) { toast(err.message, true); });
    });
    qs('#btn-delete-scene').addEventListener('click', function () {
      deleteSelectedScene().catch(function (err) { toast(err.message, true); });
    });
    qs('#btn-publish').addEventListener('click', function () {
      publishTour().catch(function (err) { toast(err.message, true); });
    });
    qs('#btn-export').addEventListener('click', function () { window.location.href = cfg.urls.export; });
    qs('#btn-delete').addEventListener('click', function () {
      deleteTour().catch(function (err) { toast(err.message, true); });
    });
    qs('#link-picker-close').addEventListener('click', hideLinkPicker);
    qs('#linkPickerOverlay').addEventListener('click', function (e) {
      // Click outside the inner card to dismiss
      if (e.target === this) hideLinkPicker();
    });

    window.addEventListener('resize', function () {
      if (!state.tour) return;
      state.tour.scenes.forEach(function (scene) {
        const m = qs('.scene-marker[data-scene-id="' + scene.id + '"]');
        if (m) positionMarker(m, scene);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    init().catch(function (err) { console.error(err); toast('Failed to load tour: ' + err.message, true); });
  });

}());
