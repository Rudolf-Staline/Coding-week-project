(function () {
  function initAnatomyViewer() {
    var mount = document.getElementById('anatomyViewer');
    var fallback = document.getElementById('bodyFallback');
    var shell = document.getElementById('bodyViewerShell');
    var tooltip = document.getElementById('organTooltip');

    if (!mount) return;
    if (!window.THREE) {
      if (fallback) fallback.hidden = false;
      if (shell) shell.classList.add('viewer-unavailable');
      return;
    }

    var THREE = window.THREE;

    /* ═══════ Scene ═══════ */
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8f0);
    scene.fog = new THREE.Fog(0xdce8f0, 22, 35);

    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, -0.3, 12);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 400, mount.clientHeight || 600, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    mount.appendChild(renderer.domElement);

    /* ═══════ Controls ═══════ */
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.minDistance = 9;
      controls.maxDistance = 18;
      controls.minPolarAngle = Math.PI * 0.3;
      controls.maxPolarAngle = Math.PI * 0.7;
      controls.target.set(0, -0.6, 0);
    }

    /* ═══════ Lighting — studio setup ═══════ */
    scene.add(new THREE.AmbientLight(0xfff5ee, 0.6));

    var hemi = new THREE.HemisphereLight(0xfff8f0, 0x8899aa, 1.0);
    scene.add(hemi);

    var keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(3, 8, 6);
    keyLight.castShadow = false;
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0xc4deff, 0.7);
    fillLight.position.set(-4, 4, 2);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0xffeedd, 0.9);
    rimLight.position.set(0, 3, -6);
    scene.add(rimLight);

    var spotBelow = new THREE.PointLight(0xddeeff, 0.4, 12, 2);
    spotBelow.position.set(0, -3, 3);
    scene.add(spotBelow);

    /* ═══════ Root ═══════ */
    var root = new THREE.Group();
    root.position.y = -0.6;
    scene.add(root);
    var anatomy = new THREE.Group();
    root.add(anatomy);

    /* ═══════ Raycasting ═══════ */
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2(-9, -9);
    var clickables = [];
    var hoveredObj = null;
    var hoveredEmissive = null;

    function onPointerMove(e) {
      var r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    }
    function findTagged(obj) {
      while (obj) {
        if (obj.userData && obj.userData.zone) return obj;
        obj = obj.parent;
      }
      return null;
    }
    function navigateTo(zone) {
      var sec = document.getElementById('section-' + zone);
      if (!sec) return;
      document.querySelectorAll('.form-section').forEach(function (s) {
        if (s !== sec) s.classList.remove('highlight');
      });
      if (!sec.classList.contains('open') && typeof window.toggleSection === 'function') {
        window.toggleSection(zone);
      }
      sec.classList.add('highlight');
      sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { sec.classList.remove('highlight'); }, 2000);
      document.querySelectorAll('.legend-pill').forEach(function (p) {
        p.classList.toggle('legend-active', p.dataset.target === zone);
      });
    }
    function onPointerClick() {
      raycaster.setFromCamera(mouse, camera);
      var hits = raycaster.intersectObjects(clickables, true);
      if (hits.length) {
        var t = findTagged(hits[0].object);
        if (t) navigateTo(t.userData.zone);
      }
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);
    renderer.domElement.addEventListener('pointerleave', function () { mouse.set(-9, -9); });

    /* ═══════ Materials ═══════ */

    /* Skin — warm realistic skin color */
    var skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8b998,
      roughness: 0.65,
      metalness: 0.0,
      clearcoat: 0.15,
      clearcoatRoughness: 0.5,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffccaa)
    });

    /* Muscles — visible through semi-transparent envelope */
    var muscleMat = new THREE.MeshPhysicalMaterial({
      color: 0xbb4444,
      roughness: 0.55,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4
    });

    /* Muscle fiber detail overlay */
    var fiberMat = new THREE.MeshPhysicalMaterial({
      color: 0xcc5555,
      roughness: 0.5,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
      clearcoat: 0.2
    });

    /* Tendon / fascia */
    var tendonMat = new THREE.MeshStandardMaterial({
      color: 0xeeddcc,
      roughness: 0.45,
      metalness: 0.0
    });

    /* Bone */
    var boneMat = new THREE.MeshStandardMaterial({
      color: 0xf5efe6,
      emissive: 0x332211,
      emissiveIntensity: 0.08,
      roughness: 0.4,
      metalness: 0.02
    });

    /* Artery */
    var arteryMat = new THREE.MeshPhysicalMaterial({
      color: 0xcc2222,
      emissive: 0x660808,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25
    });

    /* Vein */
    var veinMat = new THREE.MeshPhysicalMaterial({
      color: 0x3344aa,
      emissive: 0x111144,
      emissiveIntensity: 0.2,
      roughness: 0.35,
      clearcoat: 0.5
    });

    function organMat(color, emissive) {
      return new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: emissive || 0x000000,
        emissiveIntensity: emissive ? 0.15 : 0,
        roughness: 0.38,
        metalness: 0.02,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2
      });
    }

    /* ═══════ Helpers ═══════ */
    function cap(r, len, mat, seg) {
      var g = new THREE.Group();
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 20), mat);
      var s1 = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 20, seg || 14), mat);
      s1.position.y = len / 2;
      var s2 = s1.clone(); s2.position.y = -len / 2;
      g.add(cyl, s1, s2);
      return g;
    }
    function addM(par, geo, mat, px, py, pz, sx, sy, sz, rx, ry, rz) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (sx !== undefined) m.scale.set(sx, sy, sz);
      if (rx !== undefined) m.rotation.set(rx, ry || 0, rz || 0);
      par.add(m);
      return m;
    }
    function tag(mesh, zone, label) {
      mesh.userData.zone = zone;
      mesh.userData.label = label;
      clickables.push(mesh);
      mesh.traverse(function (c) {
        if (c.isMesh && c !== mesh) {
          c.userData.zone = zone;
          c.userData.label = label;
          clickables.push(c);
        }
      });
    }
    function tube(points, radius, segs, mat) {
      return new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segs || 40, radius, 10, false), mat);
    }
    function v3(x, y, z) { return new THREE.Vector3(x, y, z); }

    /* ═══════════════════════════════════════════════════════════════
       BODY — Realistic anatomy with skin + muscles
    ═══════════════════════════════════════════════════════════════ */
    function createBody() {
      var body = new THREE.Group();

      /* === HEAD === */
      var headG = new THREE.Group();
      // Skull base
      var head = addM(headG, new THREE.SphereGeometry(0.48, 48, 40), skinMat,
        0, 3.72, 0.02, 0.95, 1.12, 0.96);
      tag(head, 'patient_info', 'Tête / Patient');
      // Jaw
      addM(headG, new THREE.SphereGeometry(0.32, 28, 24), skinMat,
        0, 3.42, 0.1, 0.85, 0.5, 0.7);
      // Nose
      addM(headG, new THREE.ConeGeometry(0.06, 0.14, 8), skinMat,
        0, 3.66, 0.46, 1, 1, 1, 0.2);
      // Eye sockets
      addM(headG, new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.3 }),
        -0.15, 3.76, 0.4, 1.3, 0.8, 1);
      addM(headG, new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.3 }),
        0.15, 3.76, 0.4, 1.3, 0.8, 1);
      // Ears
      var earG = new THREE.TorusGeometry(0.1, 0.035, 8, 12, Math.PI);
      var earL = new THREE.Mesh(earG, skinMat);
      earL.position.set(-0.46, 3.68, 0.04); earL.rotation.y = Math.PI / 2;
      headG.add(earL);
      var earR = earL.clone(); earR.position.x = 0.46; earR.rotation.y = -Math.PI / 2;
      headG.add(earR);
      body.add(headG);

      /* === NECK === */
      var neck = cap(0.14, 0.32, muscleMat, 20);
      neck.position.set(0, 2.98, 0.02);
      body.add(neck);
      // Sternocleidomastoid muscles
      addM(body, new THREE.CylinderGeometry(0.05, 0.04, 0.38, 8), muscleMat,
        -0.1, 2.92, 0.08, 1, 1, 1, 0.2, 0, 0.15);
      addM(body, new THREE.CylinderGeometry(0.05, 0.04, 0.38, 8), muscleMat,
        0.1, 2.92, 0.08, 1, 1, 1, 0.2, 0, -0.15);

      /* === TORSO === */
      // Rib cage volume
      addM(body, new THREE.SphereGeometry(0.96, 48, 44), fiberMat,
        0, 1.92, 0.06, 0.86, 1.28, 0.58, 0.04);
      // Abdomen
      addM(body, new THREE.SphereGeometry(0.88, 44, 40), skinMat,
        0, 0.76, 0.08, 0.78, 1.02, 0.54);
      // Pelvis region
      addM(body, new THREE.SphereGeometry(0.72, 40, 36), skinMat,
        0, -0.42, 0.02, 1.0, 0.68, 0.66);

      /* === PECTORALS === */
      addM(body, new THREE.SphereGeometry(0.34, 28, 22), muscleMat,
        -0.28, 2.08, 0.28, 1.15, 0.72, 0.42, 0.1, 0.08);
      addM(body, new THREE.SphereGeometry(0.34, 28, 22), muscleMat,
        0.28, 2.08, 0.28, 1.15, 0.72, 0.42, 0.1, -0.08);

      /* === ABDOMINALS — 6-pack + obliques === */
      var abMat = new THREE.MeshPhysicalMaterial({
        color: 0xcc6655, roughness: 0.55, metalness: 0.0,
        clearcoat: 0.15
      });
      for (var ab = 0; ab < 4; ab++) {
        var abY = 1.28 - ab * 0.175;
        addM(body, new THREE.BoxGeometry(0.16, 0.14, 0.04, 2, 2), abMat,
          -0.1, abY, 0.36, 1, 1, 1);
        addM(body, new THREE.BoxGeometry(0.16, 0.14, 0.04, 2, 2), abMat,
          0.1, abY, 0.36, 1, 1, 1);
      }
      // External obliques
      addM(body, new THREE.SphereGeometry(0.25, 16, 12), fiberMat,
        -0.52, 1.04, 0.12, 0.55, 1.6, 0.35, 0, 0, -0.18);
      addM(body, new THREE.SphereGeometry(0.25, 16, 12), fiberMat,
        0.52, 1.04, 0.12, 0.55, 1.6, 0.35, 0, 0, 0.18);

      /* === SERRATUS ANTERIOR === */
      for (var sr = 0; sr < 4; sr++) {
        addM(body, new THREE.BoxGeometry(0.12, 0.06, 0.03), fiberMat,
          -0.6, 1.7 - sr * 0.14, 0.12 + sr * 0.02, 1, 1, 1, 0, 0, 0.15);
        addM(body, new THREE.BoxGeometry(0.12, 0.06, 0.03), fiberMat,
          0.6, 1.7 - sr * 0.14, 0.12 + sr * 0.02, 1, 1, 1, 0, 0, -0.15);
      }

      /* === SHOULDERS / DELTOIDS === */
      addM(body, new THREE.SphereGeometry(0.24, 24, 20), muscleMat,
        -0.86, 2.32, 0.06, 1.4, 1.15, 1.0);
      addM(body, new THREE.SphereGeometry(0.24, 24, 20), muscleMat,
        0.86, 2.32, 0.06, 1.4, 1.15, 1.0);

      /* === TRAPEZIUS hints === */
      addM(body, new THREE.SphereGeometry(0.35, 20, 16), fiberMat,
        -0.25, 2.62, -0.1, 1.2, 0.6, 0.35);
      addM(body, new THREE.SphereGeometry(0.35, 20, 16), fiberMat,
        0.25, 2.62, -0.1, 1.2, 0.6, 0.35);

      /* === ARMS === */
      function buildArm(side) {
        var s = side < 0 ? -1 : 1;
        var arm = new THREE.Group();
        arm.position.set(s * 0.86, 2.2, 0);

        // Bicep
        var bicep = addM(arm, new THREE.SphereGeometry(0.16, 20, 16), muscleMat,
          s * 0.08, -0.35, 0.06, 1.0, 2.4, 0.9);
        // Tricep
        addM(arm, new THREE.SphereGeometry(0.14, 18, 14), fiberMat,
          s * 0.06, -0.38, -0.05, 0.9, 2.2, 0.85);
        // Upper arm skin
        var upperSkin = cap(0.16, 1.1, skinMat, 18);
        upperSkin.rotation.z = s * 0.26;
        upperSkin.position.set(s * 0.14, -0.42, 0);
        arm.add(upperSkin);

        // Elbow
        addM(arm, new THREE.SphereGeometry(0.08, 12, 10), tendonMat,
          s * 0.28, -0.92, 0);

        // Forearm
        var forearm = cap(0.12, 0.9, skinMat, 16);
        forearm.rotation.z = s * 0.16;
        forearm.position.set(s * 0.4, -1.18, 0.02);
        arm.add(forearm);
        // Forearm muscle
        addM(arm, new THREE.SphereGeometry(0.11, 14, 10), fiberMat,
          s * 0.34, -1.0, 0.04, 0.8, 1.8, 0.7);

        // Wrist
        addM(arm, new THREE.SphereGeometry(0.06, 10, 8), tendonMat,
          s * 0.54, -1.55, 0.02, 1.2, 0.7, 0.9);

        // Hand
        var hand = new THREE.Group();
        addM(hand, new THREE.BoxGeometry(0.14, 0.18, 0.06, 2, 2), skinMat,
          0, -0.04, 0);
        for (var f = 0; f < 4; f++) {
          var fg = cap(0.018, 0.13, skinMat, 6);
          fg.position.set(-0.04 + f * 0.028, -0.16, 0);
          hand.add(fg);
        }
        var th = cap(0.02, 0.1, skinMat, 6);
        th.position.set(s < 0 ? 0.1 : -0.1, -0.04, 0.04);
        th.rotation.z = s < 0 ? -0.6 : 0.6;
        hand.add(th);
        hand.position.set(s * 0.62, -1.7, 0.06);
        arm.add(hand);

        body.add(arm);
      }
      buildArm(-1);
      buildArm(1);

      /* === LEGS === */
      function buildLeg(side) {
        var s = side < 0 ? -1 : 1;
        var leg = new THREE.Group();
        leg.position.set(s * 0.34, -0.82, 0);

        // Quadriceps
        addM(leg, new THREE.SphereGeometry(0.2, 22, 18), muscleMat,
          0, -0.6, 0.08, 1.0, 2.8, 0.85);
        // Thigh skin
        var thigh = cap(0.21, 1.48, skinMat, 22);
        thigh.position.set(0, -0.76, 0.02);
        thigh.rotation.z = s * 0.02;
        leg.add(thigh);
        // Inner thigh
        addM(leg, new THREE.SphereGeometry(0.15, 16, 12), fiberMat,
          -s * 0.08, -0.5, -0.02, 0.7, 2.0, 0.6);

        // Patella
        addM(leg, new THREE.SphereGeometry(0.06, 12, 10), tendonMat,
          0, -1.44, 0.2, 1.3, 0.8, 1.1);

        // Shin + calf
        var shin = cap(0.15, 1.36, skinMat, 20);
        shin.position.set(0, -2.14, 0.04);
        leg.add(shin);
        // Calf muscle (gastrocnemius)
        addM(leg, new THREE.SphereGeometry(0.14, 16, 12), muscleMat,
          0, -1.78, -0.04, 0.9, 1.8, 0.8);
        // Tibialis anterior
        addM(leg, new THREE.SphereGeometry(0.08, 12, 10), fiberMat,
          s * 0.04, -1.9, 0.12, 0.6, 2.0, 0.55);

        // Ankle
        addM(leg, new THREE.SphereGeometry(0.055, 10, 8), tendonMat,
          0, -2.78, 0.04, 1.2, 0.7, 1.0);

        // Foot
        var foot = new THREE.Group();
        addM(foot, new THREE.BoxGeometry(0.3, 0.1, 0.7), skinMat, 0, 0, 0.12);
        // Toes
        for (var t = 0; t < 5; t++) {
          addM(foot, new THREE.SphereGeometry(0.028, 8, 6), skinMat,
            -0.1 + t * 0.052, -0.01, 0.5);
        }
        foot.position.set(0, -3.04, 0.18);
        leg.add(foot);

        body.add(leg);
      }
      buildLeg(-1);
      buildLeg(1);

      /* === LINEA ALBA (center line) === */
      var lineaMat = new THREE.MeshBasicMaterial({ color: 0xddaa88, transparent: true, opacity: 0.4 });
      addM(body, new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6), lineaMat,
        0, 1.08, 0.37);

      /* === CLAVICLE surface hints === */
      addM(body, new THREE.CylinderGeometry(0.03, 0.025, 0.66, 8), tendonMat,
        -0.32, 2.54, 0.12, 1, 1, 1, 0, 0, 1.2);
      addM(body, new THREE.CylinderGeometry(0.03, 0.025, 0.66, 8), tendonMat,
        0.32, 2.54, 0.12, 1, 1, 1, 0, 0, -1.2);

      anatomy.add(body);
    }

    /* ═══════════════════════════════════════════════════════════════
       SKELETON
    ═══════════════════════════════════════════════════════════════ */
    function createSkeleton() {
      var sk = new THREE.Group();

      // 12 rib pairs
      for (var i = 0; i < 12; i++) {
        var rr = 0.58 - i * 0.018;
        var arc = Math.PI * (i < 7 ? 0.92 : 0.78 - (i - 7) * 0.06);
        var rib = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.014, 8, 40, arc), boneMat);
        rib.rotation.z = Math.PI;
        rib.position.set(0, 2.24 - i * 0.19, -0.02 + i * 0.006);
        sk.add(rib);
      }

      // Sternum
      var stG = THREE.CapsuleGeometry
        ? new THREE.CapsuleGeometry(0.025, 0.72, 5, 10)
        : new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8);
      addM(sk, stG, boneMat, 0, 1.68, 0.08);

      // Spine
      for (var v = 0; v < 18; v++) {
        addM(sk, new THREE.SphereGeometry(0.055, 10, 10), boneMat,
          0, 2.34 - v * 0.19, -0.12, 1.1, 0.5, 0.85);
      }

      // Pelvis
      var pelvis = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.05, 10, 44, Math.PI * 1.15), boneMat);
      pelvis.rotation.x = Math.PI / 2.2;
      pelvis.rotation.z = Math.PI;
      pelvis.position.set(0, -0.32, -0.06);
      sk.add(pelvis);

      // Iliac crest
      addM(sk, new THREE.SphereGeometry(0.24, 14, 10), boneMat,
        -0.38, -0.18, -0.04, 0.55, 0.9, 0.14, 0, 0, 0.28);
      addM(sk, new THREE.SphereGeometry(0.24, 14, 10), boneMat,
        0.38, -0.18, -0.04, 0.55, 0.9, 0.14, 0, 0, -0.28);

      anatomy.add(sk);
    }

    /* ═══════════════════════════════════════════════════════════════
       ORGANS — clickable via raycasting
    ═══════════════════════════════════════════════════════════════ */
    function createOrgans() {
      var og = new THREE.Group();

      var lungM    = organMat(0xeea4a8, 0x662828);
      var heartM   = organMat(0xbb2222, 0x550808);
      var liverM   = organMat(0x8b3333, 0x3a0e0e);
      var stomachM = organMat(0xe8a866, 0x6b4010);
      var intestM  = organMat(0xddb888, 0x665530);
      var kidneyM  = organMat(0xcc6688, 0x551828);
      var bladderM = organMat(0xbbcc55, 0x445510);
      var spleenM  = organMat(0xaa4466, 0x441828);
      var pancrM   = organMat(0xe0c088, 0x6b5020);
      var trachM   = organMat(0xddaaaa, 0x553333);

      /* Trachea + Bronchi */
      var tr = tube([v3(0, 2.8, 0.06), v3(0, 2.5, 0.08), v3(0, 2.26, 0.1)], 0.035, 18, trachM);
      tag(tr, 'blood', 'Trachée');
      og.add(tr);
      og.add(tube([v3(0, 2.26, 0.1), v3(-0.18, 2.1, 0.12), v3(-0.32, 1.94, 0.13)], 0.022, 14, trachM));
      og.add(tube([v3(0, 2.26, 0.1), v3(0.18, 2.1, 0.12), v3(0.32, 1.94, 0.13)], 0.022, 14, trachM));

      /* Lungs */
      var lungL = addM(og, new THREE.SphereGeometry(0.42, 36, 30), lungM,
        -0.4, 1.74, 0.1, 0.78, 1.3, 0.48, 0.06, 0.1, -0.06);
      tag(lungL, 'blood', 'Poumon gauche');
      var lungR = addM(og, new THREE.SphereGeometry(0.42, 36, 30), lungM,
        0.4, 1.74, 0.1, 0.78, 1.3, 0.48, 0.06, -0.1, 0.06);
      tag(lungR, 'blood', 'Poumon droit');

      /* Heart */
      var heart = addM(og, new THREE.IcosahedronGeometry(0.28, 3), heartM,
        0.06, 1.28, 0.26, 0.82, 1.15, 0.78, 0.16, -0.06, -0.28);
      heart.userData.baseScale = { x: 0.82, y: 1.15, z: 0.78 };
      tag(heart, 'blood', 'Cœur');

      /* Diaphragm */
      var diaM = new THREE.MeshPhysicalMaterial({
        color: 0xcc8866, transparent: true, opacity: 0.35,
        roughness: 0.55, side: THREE.DoubleSide, depthWrite: false
      });
      var dia = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), diaM);
      dia.rotation.x = -Math.PI / 2 + 0.12;
      dia.position.set(0, 1.0, 0.04);
      og.add(dia);

      /* Liver */
      var liver = addM(og, new THREE.SphereGeometry(0.48, 32, 28), liverM,
        0.35, 0.58, 0.1, 1.0, 0.4, 0.52, 0.1, -0.16, 0.04);
      tag(liver, 'abdominal', 'Foie');

      /* Gallbladder */
      var gb = addM(og, new THREE.SphereGeometry(0.06, 14, 10), organMat(0x77bb44, 0x2a5508),
        0.26, 0.4, 0.26, 0.65, 1.2, 0.75);
      tag(gb, 'abdominal', 'Vésicule biliaire');

      /* Stomach */
      var stom = addM(og, new THREE.SphereGeometry(0.32, 28, 22), stomachM,
        -0.28, 0.74, 0.2, 0.68, 1.1, 0.44, 0.06, 0.08, -0.3);
      tag(stom, 'abdominal', 'Estomac');

      /* Pancreas */
      var pancr = addM(og, new THREE.SphereGeometry(0.18, 18, 14), pancrM,
        0.04, 0.44, 0.14, 1.7, 0.32, 0.42, 0.04, 0, -0.1);
      tag(pancr, 'abdominal', 'Pancréas');

      /* Spleen */
      var spleen = addM(og, new THREE.SphereGeometry(0.14, 18, 14), spleenM,
        -0.66, 0.6, 0.06, 0.78, 1.2, 0.48, 0.04, 0.08, -0.18);
      tag(spleen, 'abdominal', 'Rate');

      /* Kidneys */
      var kl = addM(og, new THREE.SphereGeometry(0.18, 24, 20), kidneyM,
        -0.54, 0.2, -0.02, 0.75, 1.2, 0.52, 0.08, 0.06, -0.08);
      tag(kl, 'urinary', 'Rein gauche');
      var kr = addM(og, new THREE.SphereGeometry(0.18, 24, 20), kidneyM,
        0.54, 0.2, -0.02, 0.75, 1.2, 0.52, 0.08, -0.06, 0.08);
      tag(kr, 'urinary', 'Rein droit');

      /* Adrenals */
      var adM = organMat(0xddaa44, 0x665510);
      addM(og, new THREE.SphereGeometry(0.05, 10, 8), adM, -0.52, 0.38, -0.02, 1.1, 0.55, 0.7);
      addM(og, new THREE.SphereGeometry(0.05, 10, 8), adM, 0.52, 0.38, -0.02, 1.1, 0.55, 0.7);

      /* Ureters */
      og.add(tube([v3(-0.48, 0.04, 0.02), v3(-0.32, -0.34, 0.08), v3(-0.1, -0.58, 0.14)], 0.01, 18, kidneyM));
      og.add(tube([v3(0.48, 0.04, 0.02), v3(0.32, -0.34, 0.08), v3(0.1, -0.58, 0.14)], 0.01, 18, kidneyM));

      /* Bladder */
      var bl = addM(og, new THREE.SphereGeometry(0.16, 22, 18), bladderM,
        0, -0.68, 0.18, 1.1, 0.9, 0.8);
      tag(bl, 'urinary', 'Vessie');

      /* Colon */
      var colon = tube([
        v3(0.76, 0.3, 0.08), v3(0.84, -0.06, 0.06), v3(0.66, -0.42, 0.08),
        v3(0.16, -0.54, 0.16), v3(-0.38, -0.52, 0.16), v3(-0.8, -0.24, 0.06),
        v3(-0.76, 0.2, 0.06)
      ], 0.07, 80, intestM);
      tag(colon, 'abdominal', 'Côlon');
      og.add(colon);

      /* Small intestine */
      var siLoops = [
        [v3(-0.36, 0.0, 0.16), v3(-0.06, 0.1, 0.22), v3(0.18, -0.02, 0.22), v3(0.34, -0.22, 0.14)],
        [v3(-0.3, -0.24, 0.16), v3(-0.04, -0.08, 0.24), v3(0.2, -0.24, 0.2), v3(0.34, -0.02, 0.12)],
        [v3(-0.26, -0.42, 0.14), v3(0.02, -0.3, 0.24), v3(0.24, -0.42, 0.18), v3(0.3, -0.2, 0.1)],
        [v3(0.06, 0.06, 0.2), v3(-0.16, -0.14, 0.25), v3(0.1, -0.32, 0.21), v3(0.28, -0.12, 0.15)]
      ];
      siLoops.forEach(function (pts, idx) {
        var lp = tube(pts, 0.044 - idx * 0.003, 50, intestM);
        tag(lp, 'abdominal', 'Intestin grêle');
        og.add(lp);
      });

      /* Appendix — inflamed */
      var appMat = new THREE.MeshPhysicalMaterial({
        color: 0xff4444, emissive: 0xaa1111, emissiveIntensity: 0.7,
        roughness: 0.3, clearcoat: 0.6
      });
      var appx = tube([v3(0.68, -0.34, 0.14), v3(0.84, -0.5, 0.16), v3(0.92, -0.76, 0.1)], 0.032, 24, appMat);
      tag(appx, 'abdominal', 'Appendice ⚠');
      og.add(appx);

      /* === VESSELS === */
      // Aorta with arch
      var aorta = tube([
        v3(0.06, 1.44, 0.2), v3(0.12, 1.66, 0.16), v3(0.06, 1.78, 0.06),
        v3(-0.04, 1.72, 0.02), v3(-0.04, 1.48, 0.04),
        v3(0.04, 0.44, 0.04), v3(0.02, -0.2, -0.02), v3(-0.1, -0.86, -0.06)
      ], 0.035, 70, arteryMat);
      tag(aorta, 'blood', 'Aorte');
      og.add(aorta);

      // Vena cava
      var vc = tube([
        v3(-0.06, 1.38, 0.16), v3(-0.06, 0.98, 0.12),
        v3(-0.04, 0.36, 0.02), v3(-0.02, -0.16, -0.04), v3(0.06, -0.82, -0.08)
      ], 0.03, 50, veinMat);
      tag(vc, 'blood', 'Veine cave');
      og.add(vc);

      // Subclavian arteries
      og.add(tube([v3(0.08, 1.28, 0.14), v3(-0.26, 1.66, 0.1), v3(-0.72, 1.86, 0.02)], 0.018, 24, arteryMat));
      og.add(tube([v3(-0.08, 1.28, 0.14), v3(0.26, 1.66, 0.1), v3(0.72, 1.86, 0.02)], 0.018, 24, arteryMat));

      // Renal arteries
      og.add(tube([v3(0.02, 0.2, 0.02), v3(-0.24, 0.19, 0.0), v3(-0.44, 0.18, -0.01)], 0.012, 14, arteryMat));
      og.add(tube([v3(0.02, 0.2, 0.02), v3(0.24, 0.19, 0.0), v3(0.44, 0.18, -0.01)], 0.012, 14, arteryMat));

      // Iliac arteries
      og.add(tube([v3(-0.04, -0.76, -0.04), v3(-0.2, -1.0, 0.0), v3(-0.32, -1.28, 0.02)], 0.015, 14, arteryMat));
      og.add(tube([v3(0.04, -0.76, -0.04), v3(0.2, -1.0, 0.0), v3(0.32, -1.28, 0.02)], 0.015, 14, arteryMat));

      // Pulmonary arteries
      og.add(tube([v3(0.06, 1.32, 0.24), v3(-0.12, 1.5, 0.18), v3(-0.28, 1.58, 0.14)], 0.014, 14, arteryMat));
      og.add(tube([v3(0.06, 1.32, 0.24), v3(0.18, 1.5, 0.18), v3(0.32, 1.58, 0.14)], 0.014, 14, arteryMat));

      // Esophagus
      og.add(tube([v3(0, 2.24, -0.01), v3(-0.04, 1.76, -0.02), v3(-0.08, 1.3, 0.02), v3(-0.18, 0.94, 0.12)], 0.018, 26, stomachM));

      anatomy.add(og);

      return {
        heart: heart,
        lungs: [lungL, lungR],
        appendixMaterial: appMat,
        organs: og
      };
    }

    /* ═══════════════════════════════════════════════════════════════
       FLOOR
    ═══════════════════════════════════════════════════════════════ */
    function createFloor() {
      var floor = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 48),
        new THREE.MeshStandardMaterial({ color: 0xccddee, roughness: 0.8, metalness: 0.0 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -4.2;
      root.add(floor);

      // Subtle shadow blob
      var shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x667788, transparent: true, opacity: 0.18 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -4.19;
      root.add(shadow);
    }

    /* ═══════ BUILD ═══════ */
    createBody();
    createSkeleton();
    var anim = createOrgans();
    createFloor();

    anatomy.rotation.y = -0.05;

    /* ═══════ Resize ═══════ */
    function resize() {
      var w = mount.clientWidth || 400;
      var h = mount.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    /* ═══════ Hover ═══════ */
    function updateHover() {
      raycaster.setFromCamera(mouse, camera);
      var hits = raycaster.intersectObjects(clickables, true);

      if (hoveredObj && hoveredObj.material) {
        if (hoveredEmissive !== null) hoveredObj.material.emissiveIntensity = hoveredEmissive;
        renderer.domElement.style.cursor = '';
      }

      if (hits.length > 0) {
        var obj = hits[0].object;
        var tagged = findTagged(obj);
        if (obj.material && obj !== hoveredObj) {
          hoveredObj = obj;
          hoveredEmissive = obj.material.emissiveIntensity;
          obj.material.emissiveIntensity = Math.min((hoveredEmissive || 0) + 0.45, 1.0);
          renderer.domElement.style.cursor = 'pointer';
        }
        if (tooltip && tagged) {
          var p3 = new THREE.Vector3();
          obj.getWorldPosition(p3);
          p3.project(camera);
          var rect = mount.getBoundingClientRect();
          tooltip.textContent = tagged.userData.label;
          tooltip.style.left = ((p3.x * 0.5 + 0.5) * rect.width) + 'px';
          tooltip.style.top = ((-p3.y * 0.5 + 0.5) * rect.height - 36) + 'px';
          tooltip.classList.add('visible');
        }
      } else {
        hoveredObj = null;
        hoveredEmissive = null;
        if (tooltip) tooltip.classList.remove('visible');
      }
    }

    /* ═══════ Animation loop ═══════ */
    function frame(time) {
      var t = time * 0.001;

      // Gentle breathing sway
      root.position.y = -0.6 + Math.sin(t * 1.1) * 0.02;

      // Heartbeat
      if (anim.heart) {
        var beat = 1 + Math.sin(t * 5.2) * 0.032;
        anim.heart.scale.set(
          anim.heart.userData.baseScale.x * beat,
          anim.heart.userData.baseScale.y * beat,
          anim.heart.userData.baseScale.z * beat
        );
      }

      // Breathing
      anim.lungs.forEach(function (lung, i) {
        var br = 1 + Math.sin(t * 1.6 + i * 0.4) * 0.02;
        lung.scale.y = 1.3 * br;
        lung.scale.x = 0.78 + (br - 1) * 0.35;
      });

      // Appendix pulse
      if (anim.appendixMaterial) {
        anim.appendixMaterial.emissiveIntensity = 0.5 + (Math.sin(t * 4.6) + 1) * 0.25;
      }

      // Organs micro-sway
      anim.organs.rotation.y = Math.sin(t * 0.35) * 0.02;

      updateHover();

      if (controls) {
        controls.update();
      } else {
        anatomy.rotation.y = -0.05 + Math.sin(t * 0.45) * 0.14;
      }

      renderer.render(scene, camera);
      window.requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize();
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnatomyViewer);
  } else {
    initAnatomyViewer();
  }
})();
