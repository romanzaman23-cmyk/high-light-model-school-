/**
 * =========================================================================
 * HIGHLIGHT MODEL SCHOOL - 3D INTERACTIVE UNIFORM ENGINE
 * Premium High-Precision Showroom Mannequin Engine (Three.js WebGL)
 * Real-time 360° Inspection of Official Boys & Girls School Uniform
 * Exact Colors: Pistachio Sage Green (#78927a), Khaki Beige (#b0967d), Forest Green (#153c1f)
 * =========================================================================
 */

let uniformScene, uniformCamera, uniformRenderer;
let uniformModelGroup;
let isAutoRotating = false; // Starts facing front so user sees the uniform immediately
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let currentUniformGender = "boy"; // 'boy' or 'girl'
let isInitialized = false;

function bootstrapUniform3D() {
  if (isInitialized) return;
  if (typeof THREE === "undefined") {
    setTimeout(bootstrapUniform3D, 80);
    return;
  }
  const container = document.getElementById("uniform3dCanvasContainer");
  if (!container) {
    setTimeout(bootstrapUniform3D, 100);
    return;
  }
  isInitialized = true;
  initUniform3D();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapUniform3D);
} else {
  bootstrapUniform3D();
}

function initUniform3D() {
  const container = document.getElementById("uniform3dCanvasContainer");
  if (!container) return;

  // Clear any existing elements inside container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // 1. Scene setup
  uniformScene = new THREE.Scene();
  uniformScene.background = new THREE.Color(0xf8fafc); // Crisp light slate showroom backdrop

  // 2. Camera setup - Perfectly centered and framed from head crown to shoe pedestal
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 480;
  const aspect = width / height;
  uniformCamera = new THREE.PerspectiveCamera(34, aspect, 0.1, 1000);
  uniformCamera.position.set(0, 0.02, 4.30); // Perfectly framed view

  // 3. WebGL Renderer setup
  uniformRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  uniformRenderer.setSize(width, height);
  uniformRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  uniformRenderer.shadowMap.enabled = true;
  uniformRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.SRGBColorSpace) uniformRenderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(uniformRenderer.domElement);

  // 4. Studio Lighting setup (Sculpted 3-point fashion studio lighting)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.60);
  uniformScene.add(ambientLight);

  // Key Light (Main soft light from top-right front)
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(2.5, 3.5, 3.0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0008;
  uniformScene.add(keyLight);

  // Soft Fill Light (from left front to soften shadows)
  const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.45);
  fillLight.position.set(-3.0, 2.0, 2.2);
  uniformScene.add(fillLight);

  // Crisp Rim / Back Light (creates elegant mannequin shoulder & hair silhouette)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
  rimLight.position.set(0, 3.8, -3.0);
  uniformScene.add(rimLight);

  // Circular Display Turntable Pedestal
  const standGroup = new THREE.Group();
  const standGeo = new THREE.CylinderGeometry(0.85, 0.90, 0.08, 48);
  const standMat = new THREE.MeshStandardMaterial({ 
    color: 0xe2e8f0, 
    roughness: 0.32,
    metalness: 0.08
  });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = -1.14;
  stand.receiveShadow = true;
  standGroup.add(stand);

  // Soft Contact Shadow Disc under pedestal
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext("2d");
  const grad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, "rgba(15, 23, 42, 0.35)");
  grad.addColorStop(0.5, "rgba(15, 23, 42, 0.12)");
  grad.addColorStop(1, "rgba(15, 23, 42, 0.0)");
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ 
    map: shadowTex, 
    transparent: true, 
    opacity: 0.75 
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = -1.096;
  standGroup.add(shadowMesh);

  uniformScene.add(standGroup);

  // 5. Build 3D Mannequin Model
  uniformModelGroup = new THREE.Group();
  uniformScene.add(uniformModelGroup);
  buildUniformModel(currentUniformGender);

  // 6. Mouse / Touch Orbit Controls
  setupCanvasInteraction(container);

  // 7. Resize handling
  window.addEventListener("resize", onWindowResize);

  // 8. Animation loop
  animate();
}

function onWindowResize() {
  const container = document.getElementById("uniform3dCanvasContainer");
  if (!container || !uniformRenderer || !uniformCamera) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 480;
  uniformCamera.aspect = width / height;
  uniformCamera.updateProjectionMatrix();
  uniformRenderer.setSize(width, height);
}

// -------------------------------------------------------------------------
// PROCEDURAL STRIPED TIE TEXTURE (Institutional Forest Green & Gold Diagonal)
// Mathematically corrected for 45° diagonal repp stripes on 3D tie blade
// -------------------------------------------------------------------------
function createTieTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Rich institutional forest green base (#153c1f)
  ctx.fillStyle = "#153c1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle woven diagonal twill fabric texture
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1.5);
  }

  // To achieve a true 45° angle on a 0.038 x 0.60 meter tie blade, dy across 256px is 65px
  const dy = 65;
  const stripeThickness = 24;
  const gap = 76;

  for (let i = -100; i < canvas.height + 200; i += gap) {
    // Upper crisp white pinstripe
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i + dy);
    ctx.lineTo(256, i + dy + 3);
    ctx.lineTo(0, i + 3);
    ctx.closePath();
    ctx.fill();

    // Main Warm Gold Stripe
    ctx.fillStyle = "#d4b373";
    ctx.beginPath();
    ctx.moveTo(0, i + 3);
    ctx.lineTo(256, i + dy + 3);
    ctx.lineTo(256, i + dy + 3 + stripeThickness);
    ctx.lineTo(0, i + 3 + stripeThickness);
    ctx.closePath();
    ctx.fill();

    // Lower crisp white pinstripe
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, i + 3 + stripeThickness);
    ctx.lineTo(256, i + dy + 3 + stripeThickness);
    ctx.lineTo(256, i + dy + 6 + stripeThickness);
    ctx.lineTo(0, i + 6 + stripeThickness);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// -------------------------------------------------------------------------
// OFFICIAL EMBROIDERED CREST BADGE TEXTURE (Native TextureLoader)
// -------------------------------------------------------------------------
let officialCrestTexture = null;

function getOfficialCrestTexture() {
  if (officialCrestTexture) return officialCrestTexture;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  officialCrestTexture = loader.load("images/school_crest_badge.png");
  if (THREE.SRGBColorSpace) officialCrestTexture.colorSpace = THREE.SRGBColorSpace;
  return officialCrestTexture;
}

// -------------------------------------------------------------------------
// HELPER: SCULPTED SHOWROOM MANNEQUIN HEAD & NECK
// -------------------------------------------------------------------------
function createMannequinHeadMesh(material) {
  const headGroup = new THREE.Group();

  // 1. Tapered Neck
  const neckGeo = new THREE.CylinderGeometry(0.052, 0.062, 0.11, 32);
  const neck = new THREE.Mesh(neckGeo, material);
  neck.position.set(0, 0.90, 0.0);
  neck.castShadow = true;
  headGroup.add(neck);

  // 2. Oval Mannequin Head (Smooth Boutique Display Form)
  const headGeo = new THREE.SphereGeometry(0.108, 32, 32);
  headGeo.scale(0.92, 1.20, 1.05);
  const head = new THREE.Mesh(headGeo, material);
  head.position.set(0, 1.04, 0.012);
  head.castShadow = true;
  headGroup.add(head);

  // 3. Subtle chin / jawline transition
  const jawGeo = new THREE.SphereGeometry(0.050, 16, 16);
  jawGeo.scale(0.9, 0.6, 1.0);
  const jaw = new THREE.Mesh(jawGeo, material);
  jaw.position.set(0, 0.95, 0.032);
  headGroup.add(jaw);

  return headGroup;
}

// -------------------------------------------------------------------------
// HELPER: SCULPTED MANNEQUIN HAND
// -------------------------------------------------------------------------
function createMannequinHandMesh(isLeft, material) {
  const handGroup = new THREE.Group();

  // Palm
  const palmGeo = new THREE.BoxGeometry(0.024, 0.060, 0.038);
  const palm = new THREE.Mesh(palmGeo, material);
  palm.castShadow = true;
  handGroup.add(palm);

  // Relaxed Tapered Fingers (Gently curling inward toward leg)
  const fingersGeo = new THREE.BoxGeometry(0.018, 0.048, 0.034);
  fingersGeo.rotateX(0.10);
  const fingers = new THREE.Mesh(fingersGeo, material);
  fingers.position.set(0, -0.048, 0.005);
  fingers.castShadow = true;
  handGroup.add(fingers);

  // Thumb
  const thumbGeo = new THREE.CylinderGeometry(0.007, 0.005, 0.032, 12);
  thumbGeo.rotateZ(isLeft ? 0.35 : -0.35);
  thumbGeo.rotateX(0.16);
  const thumb = new THREE.Mesh(thumbGeo, material);
  thumb.position.set(isLeft ? 0.010 : -0.010, -0.012, 0.014);
  handGroup.add(thumb);

  return handGroup;
}

// -------------------------------------------------------------------------
// BUILD REALISTIC 3D UNIFORM MANNEQUIN
// -------------------------------------------------------------------------
function buildUniformModel(gender) {
  // Clear existing model parts
  while (uniformModelGroup.children.length > 0) {
    const obj = uniformModelGroup.children[0];
    uniformModelGroup.remove(obj);
  }

  // Reset rotation to face front by default
  uniformModelGroup.rotation.set(0, 0, 0);

  // 1. Studio Mannequin Material (Smooth Warm White Fiberglass)
  const mannequinMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f3,
    roughness: 0.36,
    metalness: 0.02
  });

  // 2. Exact Fabric Materials (Sampled directly from real uniform studio photo):
  // Pistachio / Sage Green Cotton Shirt Fabric (#78927a)
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x78927a,
    roughness: 0.88,
    metalness: 0.01
  });

  // Khaki Beige Trousers / Shalwar Twill Fabric (#b0967d)
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0xb0967d,
    roughness: 0.88,
    metalness: 0.01
  });

  // Leather Belt & Metallic Buckle
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x1f1915,
    roughness: 0.35,
    metalness: 0.05
  });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8d8,
    metalness: 0.92,
    roughness: 0.16
  });

  // Formal Black School Shoes
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.28,
    metalness: 0.18
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0x242426,
    roughness: 0.85
  });

  // White Pearl Buttons
  const buttonMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.20,
    metalness: 0.10 
  });

  // -----------------------------------------------------------------------
  // A. SCULPTED STUDIO MANNEQUIN HEAD & NECK
  // -----------------------------------------------------------------------
  const headMesh = createMannequinHeadMesh(mannequinMat);
  uniformModelGroup.add(headMesh);

  if (gender === "boy") {
    // ---------------------------------------------------------------------
    // BOYS OFFICIAL UNIFORM: Collared Shirt, Striped Tie, Khaki Pants, Belt
    // ---------------------------------------------------------------------

    // 1. Torso: Tailored Shirt Torso (Chest to Waist)
    // Upper Chest & Shoulder Yoke (Broad athletic chest, fitted silhouette)
    const chestGeo = new THREE.CylinderGeometry(0.22, 0.20, 0.36, 32);
    chestGeo.scale(1.12, 1.0, 0.65);
    const chest = new THREE.Mesh(chestGeo, shirtMat);
    chest.position.set(0, 0.63, 0.0);
    chest.castShadow = true;
    uniformModelGroup.add(chest);

    // Mid Torso & Waist (Gently tapered into belt)
    const waistGeo = new THREE.CylinderGeometry(0.20, 0.19, 0.34, 32);
    waistGeo.scale(1.08, 1.0, 0.65);
    const waist = new THREE.Mesh(waistGeo, shirtMat);
    waist.position.set(0, 0.30, 0.0);
    waist.castShadow = true;
    uniformModelGroup.add(waist);

    // Natural Sloping Shoulders (Sloping downward at -15° from neck base to shoulder points)
    // Left Shoulder Slope
    const slopeLGeo = new THREE.CylinderGeometry(0.058, 0.066, 0.22, 20);
    slopeLGeo.rotateZ(0.74);
    const slopeL = new THREE.Mesh(slopeLGeo, shirtMat);
    slopeL.position.set(-0.16, 0.77, 0.0);
    uniformModelGroup.add(slopeL);

    // Right Shoulder Slope
    const slopeRGeo = new THREE.CylinderGeometry(0.058, 0.066, 0.22, 20);
    slopeRGeo.rotateZ(-0.74);
    const slopeR = new THREE.Mesh(slopeRGeo, shirtMat);
    slopeR.position.set(0.16, 0.77, 0.0);
    uniformModelGroup.add(slopeR);

    // Deltoid Shoulder Caps
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.068, 24, 24), shirtMat);
    shoulderL.scale.set(1.0, 0.85, 0.95);
    shoulderL.position.set(-0.28, 0.74, 0.0);
    uniformModelGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.068, 24, 24), shirtMat);
    shoulderR.scale.set(1.0, 0.85, 0.95);
    shoulderR.position.set(0.28, 0.74, 0.0);
    uniformModelGroup.add(shoulderR);

    // 2. Realistic Shirt Collar (Stand Band + Spread Collar Lapels)
    const collarBandGeo = new THREE.CylinderGeometry(0.064, 0.072, 0.046, 32);
    const collarBand = new THREE.Mesh(collarBandGeo, shirtMat);
    collarBand.position.set(0, 0.84, 0.0);
    uniformModelGroup.add(collarBand);

    // Left Collar Lapel (Turn-down wing framing tie knot)
    const lapelGeoL = new THREE.BoxGeometry(0.062, 0.092, 0.008);
    lapelGeoL.rotateZ(0.36);
    lapelGeoL.rotateY(0.24);
    lapelGeoL.rotateX(-0.10);
    const leftLapel = new THREE.Mesh(lapelGeoL, shirtMat);
    leftLapel.position.set(-0.060, 0.79, 0.105);
    leftLapel.castShadow = true;
    uniformModelGroup.add(leftLapel);

    // Right Collar Lapel
    const lapelGeoR = new THREE.BoxGeometry(0.062, 0.092, 0.008);
    lapelGeoR.rotateZ(-0.36);
    lapelGeoR.rotateY(-0.24);
    lapelGeoR.rotateX(-0.10);
    const rightLapel = new THREE.Mesh(lapelGeoR, shirtMat);
    rightLapel.position.set(0.060, 0.79, 0.105);
    rightLapel.castShadow = true;
    uniformModelGroup.add(rightLapel);

    // 3. Center Button Placket & Buttons
    const placketGeo = new THREE.BoxGeometry(0.026, 0.64, 0.008);
    const placket = new THREE.Mesh(placketGeo, shirtMat);
    placket.position.set(0, 0.46, 0.144);
    uniformModelGroup.add(placket);

    for (let i = 0; i < 4; i++) {
      const btnGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 16);
      btnGeo.rotateX(Math.PI / 2);
      const btn = new THREE.Mesh(btnGeo, buttonMat);
      btn.position.set(0, 0.65 - i * 0.14, 0.149);
      uniformModelGroup.add(btn);
    }

    // 4. Tailored Left Chest Pocket with Official Crest
    const pocketGeo = new THREE.BoxGeometry(0.078, 0.092, 0.008);
    const pocket = new THREE.Mesh(pocketGeo, shirtMat);
    pocket.position.set(-0.130, 0.56, 0.144);
    uniformModelGroup.add(pocket);

    // Pocket Top Hem Band
    const pocketHem = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.010, 0.009), shirtMat);
    pocketHem.position.set(-0.130, 0.605, 0.147);
    uniformModelGroup.add(pocketHem);

    // Official School Crest on Pocket (Clean scale, centered)
    const crestMat = new THREE.MeshStandardMaterial({
      map: getOfficialCrestTexture(),
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.35,
      metalness: 0.05
    });
    const crestGeo = new THREE.PlaneGeometry(0.042, 0.056);
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(-0.130, 0.555, 0.150);
    uniformModelGroup.add(crest);

    // 5. Official Striped Necktie (Windsor Knot + Flat Blade with V-Tip)
    const tieMat = new THREE.MeshStandardMaterial({
      map: createTieTexture(),
      roughness: 0.52,
      metalness: 0.05
    });

    // 3D Sculpted Windsor Knot
    const knotGeo = new THREE.CylinderGeometry(0.034, 0.022, 0.048, 16);
    knotGeo.scale(1.15, 1.0, 0.60);
    const knot = new THREE.Mesh(knotGeo, tieMat);
    knot.position.set(0, 0.80, 0.116);
    knot.castShadow = true;
    uniformModelGroup.add(knot);

    // Flat Tapered Tie Blade
    const tieBladeGeo = new THREE.PlaneGeometry(0.034, 0.58);
    const tieBlade = new THREE.Mesh(tieBladeGeo, tieMat);
    tieBlade.position.set(0, 0.46, 0.148);
    tieBlade.castShadow = true;
    uniformModelGroup.add(tieBlade);

    // Tie V-Tip at bottom
    const tipShape = new THREE.Shape();
    tipShape.moveTo(-0.017, 0);
    tipShape.lineTo(0.017, 0);
    tipShape.lineTo(0.0, -0.038);
    tipShape.closePath();
    const tieTip = new THREE.Mesh(new THREE.ShapeGeometry(tipShape), tieMat);
    tieTip.position.set(0, 0.17, 0.148);
    uniformModelGroup.add(tieTip);

    // 6. Natural Human Arms & Hands (Half Sleeves + Bare Mannequin Forearms & Relaxed Hands)
    // Left Half Sleeve (Short sleeve draping naturally down from shoulder)
    const sleeveLGeo = new THREE.CylinderGeometry(0.066, 0.060, 0.20, 24);
    sleeveLGeo.rotateZ(0.03);
    const sleeveL = new THREE.Mesh(sleeveLGeo, shirtMat);
    sleeveL.position.set(-0.29, 0.63, 0.0);
    sleeveL.castShadow = true;
    uniformModelGroup.add(sleeveL);

    // Left Sleeve Folded Hem Cuff
    const cuffLGeo = new THREE.CylinderGeometry(0.068, 0.066, 0.022, 24);
    cuffLGeo.rotateZ(0.03);
    const cuffL = new THREE.Mesh(cuffLGeo, shirtMat);
    cuffL.position.set(-0.293, 0.53, 0.0);
    uniformModelGroup.add(cuffL);

    // Left Forearm (Naturally hanging inward towards thigh)
    const armLGeo = new THREE.CylinderGeometry(0.038, 0.028, 0.34, 24);
    armLGeo.rotateZ(0.06);
    const armL = new THREE.Mesh(armLGeo, mannequinMat);
    armL.position.set(-0.28, 0.35, 0.0);
    armL.castShadow = true;
    uniformModelGroup.add(armL);

    // Left Sculpted Mannequin Hand (Resting naturally beside khaki thigh)
    const handL = createMannequinHandMesh(true, mannequinMat);
    handL.position.set(-0.26, 0.12, 0.0);
    handL.rotation.z = 0.04;
    uniformModelGroup.add(handL);

    // Right Half Sleeve
    const sleeveRGeo = new THREE.CylinderGeometry(0.066, 0.060, 0.20, 24);
    sleeveRGeo.rotateZ(-0.03);
    const sleeveR = new THREE.Mesh(sleeveRGeo, shirtMat);
    sleeveR.position.set(0.29, 0.63, 0.0);
    sleeveR.castShadow = true;
    uniformModelGroup.add(sleeveR);

    // Right Sleeve Folded Hem Cuff
    const cuffRGeo = new THREE.CylinderGeometry(0.068, 0.066, 0.022, 24);
    cuffRGeo.rotateZ(-0.03);
    const cuffR = new THREE.Mesh(cuffRGeo, shirtMat);
    cuffR.position.set(0.293, 0.53, 0.0);
    uniformModelGroup.add(cuffR);

    // Right Forearm
    const armRGeo = new THREE.CylinderGeometry(0.038, 0.028, 0.34, 24);
    armRGeo.rotateZ(-0.06);
    const armR = new THREE.Mesh(armRGeo, mannequinMat);
    armR.position.set(0.28, 0.35, 0.0);
    armR.castShadow = true;
    uniformModelGroup.add(armR);

    // Right Sculpted Mannequin Hand
    const handR = createMannequinHandMesh(false, mannequinMat);
    handR.position.set(0.26, 0.12, 0.0);
    handR.rotation.z = -0.04;
    uniformModelGroup.add(handR);

    // 7. Leather Belt & Metallic Buckle
    const beltGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.042, 32);
    beltGeo.scale(1.08, 1.0, 0.65);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.12, 0);
    uniformModelGroup.add(belt);

    // Chrome Buckle Frame
    const buckleOuter = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.042, 0.015), buckleMat);
    buckleOuter.position.set(0, 0.12, 0.144);
    uniformModelGroup.add(buckleOuter);

    const buckleInner = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.024, 0.018), beltMat);
    buckleInner.position.set(0, 0.12, 0.144);
    uniformModelGroup.add(buckleInner);

    // 8. Khaki Formal Trousers (Natural Tailored Fit)
    // Continuous Pelvis / Waistband Area
    const hipsGeo = new THREE.CylinderGeometry(0.20, 0.19, 0.16, 32);
    hipsGeo.scale(1.08, 1.0, 0.65);
    const hips = new THREE.Mesh(hipsGeo, pantsMat);
    hips.position.set(0, 0.02, 0);
    hips.castShadow = true;
    uniformModelGroup.add(hips);

    // Left Trouser Leg (Tapered twill leg, natural spacing)
    const legLGeo = new THREE.CylinderGeometry(0.076, 0.060, 0.96, 24);
    const legL = new THREE.Mesh(legLGeo, pantsMat);
    legL.position.set(-0.095, -0.52, 0);
    legL.castShadow = true;
    uniformModelGroup.add(legL);

    // Left Pressed Formal Center Crease
    const creaseL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.94, 0.006), pantsMat);
    creaseL.position.set(-0.095, -0.52, 0.064);
    uniformModelGroup.add(creaseL);

    // Right Trouser Leg
    const legRGeo = new THREE.CylinderGeometry(0.076, 0.060, 0.96, 24);
    const legR = new THREE.Mesh(legRGeo, pantsMat);
    legR.position.set(0.095, -0.52, 0);
    legR.castShadow = true;
    uniformModelGroup.add(legR);

    // Right Pressed Formal Center Crease
    const creaseR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.94, 0.006), pantsMat);
    creaseR.position.set(0.095, -0.52, 0.064);
    uniformModelGroup.add(creaseR);

    // Trouser Hem Cuffs above shoes
    const hemL = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.062, 0.024, 24), pantsMat);
    hemL.position.set(-0.095, -0.985, 0);
    uniformModelGroup.add(hemL);

    const hemR = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.062, 0.024, 24), pantsMat);
    hemR.position.set(0.095, -0.985, 0);
    uniformModelGroup.add(hemR);

    // 9. Black Polished Oxford Formal School Shoes
    buildFormalShoes(-0.095, 0.095, shoeMat, soleMat);

  } else {
    // ---------------------------------------------------------------------
    // GIRLS OFFICIAL UNIFORM: Pleated Frock / Kurti, Beige Shalwar, Mary Janes
    // ---------------------------------------------------------------------

    // 1. Upper Kurti / Frock Torso
    const kurtiUpperGeo = new THREE.CylinderGeometry(0.21, 0.24, 0.48, 32);
    kurtiUpperGeo.scale(1.08, 1.0, 0.65);
    const kurtiUpper = new THREE.Mesh(kurtiUpperGeo, shirtMat);
    kurtiUpper.position.set(0, 0.62, 0);
    kurtiUpper.castShadow = true;
    uniformModelGroup.add(kurtiUpper);

    // Sloping Shoulders
    const slopeLGeo = new THREE.CylinderGeometry(0.054, 0.062, 0.20, 20);
    slopeLGeo.rotateZ(0.72);
    const slopeL = new THREE.Mesh(slopeLGeo, shirtMat);
    slopeL.position.set(-0.15, 0.75, 0.0);
    uniformModelGroup.add(slopeL);

    const slopeRGeo = new THREE.CylinderGeometry(0.054, 0.062, 0.20, 20);
    slopeRGeo.rotateZ(-0.72);
    const slopeR = new THREE.Mesh(slopeRGeo, shirtMat);
    slopeR.position.set(0.15, 0.75, 0.0);
    uniformModelGroup.add(slopeR);

    // Deltoid Shoulder Caps
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 24, 24), shirtMat);
    shoulderL.position.set(-0.26, 0.73, 0.0);
    uniformModelGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.064, 24, 24), shirtMat);
    shoulderR.position.set(0.26, 0.73, 0.0);
    uniformModelGroup.add(shoulderR);

    // 2. Modest Jewel Neckline Collar
    const neckBandGeo = new THREE.CylinderGeometry(0.062, 0.070, 0.040, 32);
    const neckBand = new THREE.Mesh(neckBandGeo, shirtMat);
    neckBand.position.set(0, 0.84, 0);
    uniformModelGroup.add(neckBand);

    // Center Button Placket
    const placketGeo = new THREE.BoxGeometry(0.024, 0.42, 0.008);
    const placket = new THREE.Mesh(placketGeo, shirtMat);
    placket.position.set(0, 0.64, 0.150);
    uniformModelGroup.add(placket);

    // 4 Delicate Pearl Buttons
    for (let i = 0; i < 4; i++) {
      const btnGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.004, 16);
      btnGeo.rotateX(Math.PI / 2);
      const btn = new THREE.Mesh(btnGeo, buttonMat);
      btn.position.set(0, 0.75 - i * 0.10, 0.155);
      uniformModelGroup.add(btn);
    }

    // Chest Pin-Tucks / Vertical Stitched Pleats
    for (let p = -2; p <= 2; p++) {
      if (p === 0) continue;
      const tuck = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.38, 0.005), shirtMat);
      tuck.position.set(p * 0.030, 0.64, 0.148);
      uniformModelGroup.add(tuck);
    }

    // 3. Left Chest Pocket with Official Crest
    const pocketGeo = new THREE.BoxGeometry(0.074, 0.088, 0.008);
    const pocket = new THREE.Mesh(pocketGeo, shirtMat);
    pocket.position.set(-0.125, 0.60, 0.148);
    uniformModelGroup.add(pocket);

    // Crest badge
    const crestMat = new THREE.MeshStandardMaterial({
      map: getOfficialCrestTexture(),
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.35,
      metalness: 0.05
    });
    const crestGeo = new THREE.PlaneGeometry(0.040, 0.054);
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(-0.125, 0.595, 0.154);
    uniformModelGroup.add(crest);

    // 4. Pleated Lower Skirt Flare (A-line flare extending gracefully to knee level)
    const flareGeo = new THREE.CylinderGeometry(0.24, 0.36, 0.68, 32);
    flareGeo.scale(1.08, 1.0, 0.72);
    const flare = new THREE.Mesh(flareGeo, shirtMat);
    flare.position.set(0, 0.06, 0);
    flare.castShadow = true;
    uniformModelGroup.add(flare);

    // Front Skirt Pleat Accents
    for (let p = -3; p <= 3; p++) {
      const pleatLine = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.66, 0.006), shirtMat);
      pleatLine.position.set(p * 0.046, 0.06, 0.27 - Math.abs(p) * 0.016);
      uniformModelGroup.add(pleatLine);
    }

    // 5. Full Long Sleeves with Tailored Cuffs
    // Left Full Sleeve
    const sleeveLGeo = new THREE.CylinderGeometry(0.062, 0.048, 0.56, 24);
    sleeveLGeo.rotateZ(0.05);
    const sleeveL = new THREE.Mesh(sleeveLGeo, shirtMat);
    sleeveL.position.set(-0.28, 0.53, 0.0);
    sleeveL.castShadow = true;
    uniformModelGroup.add(sleeveL);

    // Left Wrist Button Cuff
    const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.050, 0.038, 24), shirtMat);
    cuffL.position.set(-0.292, 0.26, 0.0);
    uniformModelGroup.add(cuffL);

    // Left Mannequin Hand
    const handL = createMannequinHandMesh(true, mannequinMat);
    handL.position.set(-0.27, 0.15, 0.0);
    uniformModelGroup.add(handL);

    // Right Full Sleeve
    const sleeveRGeo = new THREE.CylinderGeometry(0.062, 0.048, 0.56, 24);
    sleeveRGeo.rotateZ(-0.05);
    const sleeveR = new THREE.Mesh(sleeveRGeo, shirtMat);
    sleeveR.position.set(0.28, 0.53, 0.0);
    sleeveR.castShadow = true;
    uniformModelGroup.add(sleeveR);

    // Right Wrist Button Cuff
    const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.050, 0.038, 24), shirtMat);
    cuffR.position.set(0.292, 0.26, 0.0);
    uniformModelGroup.add(cuffR);

    // Right Mannequin Hand
    const handR = createMannequinHandMesh(false, mannequinMat);
    handR.position.set(0.27, 0.15, 0.0);
    uniformModelGroup.add(handR);

    // 6. Beige Shalwar / Trousers (peeking under the frock)
    const legLGeo = new THREE.CylinderGeometry(0.074, 0.060, 0.74, 24);
    const legL = new THREE.Mesh(legLGeo, pantsMat);
    legL.position.set(-0.095, -0.63, 0);
    legL.castShadow = true;
    uniformModelGroup.add(legL);

    const legRGeo = new THREE.CylinderGeometry(0.074, 0.060, 0.74, 24);
    const legR = new THREE.Mesh(legRGeo, pantsMat);
    legR.position.set(0.095, -0.63, 0);
    legR.castShadow = true;
    uniformModelGroup.add(legR);

    // 7. Black Mary Jane School Shoes with Strap & Buckle
    buildMaryJaneShoes(-0.095, 0.095, shoeMat, soleMat, buckleMat);
  }
}

// -------------------------------------------------------------------------
// REALISTIC FORMAL OXFORD SCHOOL SHOES (Boys)
// -------------------------------------------------------------------------
function buildFormalShoes(leftX, rightX, shoeMat, soleMat) {
  [leftX, rightX].forEach((xPos) => {
    const shoeGroup = new THREE.Group();

    // Sole & Heel Base
    const soleGeo = new THREE.BoxGeometry(0.096, 0.024, 0.22);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -1.085, 0.03);
    shoeGroup.add(sole);

    // Stacked Heel at back
    const heelGeo = new THREE.BoxGeometry(0.088, 0.028, 0.060);
    const heel = new THREE.Mesh(heelGeo, soleMat);
    heel.position.set(0, -1.075, -0.050);
    shoeGroup.add(heel);

    // Leather Upper Body
    const upperGeo = new THREE.BoxGeometry(0.092, 0.056, 0.19);
    const upper = new THREE.Mesh(upperGeo, shoeMat);
    upper.position.set(0, -1.045, 0.02);
    shoeGroup.add(upper);

    // Smooth Curved Toe Cap
    const toeGeo = new THREE.SphereGeometry(0.046, 16, 16);
    toeGeo.scale(0.96, 0.60, 1.25);
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.position.set(0, -1.055, 0.090);
    shoeGroup.add(toe);

    shoeGroup.position.set(xPos, 0, 0);
    uniformModelGroup.add(shoeGroup);
  });
}

// -------------------------------------------------------------------------
// REALISTIC MARY JANE SCHOOL SHOES (Girls)
// -------------------------------------------------------------------------
function buildMaryJaneShoes(leftX, rightX, shoeMat, soleMat, buckleMat) {
  [leftX, rightX].forEach((xPos) => {
    const shoeGroup = new THREE.Group();

    // Low Sole Base
    const soleGeo = new THREE.BoxGeometry(0.092, 0.020, 0.20);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -1.085, 0.02);
    shoeGroup.add(sole);

    // Rounded Upper
    const upperGeo = new THREE.BoxGeometry(0.088, 0.050, 0.18);
    const upper = new THREE.Mesh(upperGeo, shoeMat);
    upper.position.set(0, -1.050, 0.02);
    shoeGroup.add(upper);

    // Rounded Front Toe
    const toeGeo = new THREE.SphereGeometry(0.044, 16, 16);
    toeGeo.scale(0.94, 0.56, 1.2);
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.position.set(0, -1.055, 0.080);
    shoeGroup.add(toe);

    // Signature Instep Strap
    const strapGeo = new THREE.BoxGeometry(0.094, 0.014, 0.018);
    const strap = new THREE.Mesh(strapGeo, shoeMat);
    strap.position.set(0, -1.025, 0.02);
    shoeGroup.add(strap);

    // Small Silver Buckle on Strap
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.020), buckleMat);
    buckle.position.set(0.038, -1.025, 0.02);
    shoeGroup.add(buckle);

    shoeGroup.position.set(xPos, 0, 0);
    uniformModelGroup.add(shoeGroup);
  });
}

// -------------------------------------------------------------------------
// INTERACTIVE MOUSE & TOUCH ORBIT CONTROLS
// -------------------------------------------------------------------------
function setupCanvasInteraction(container) {
  container.addEventListener("mousedown", onPointerDown);
  container.addEventListener("touchstart", onPointerDown, { passive: true });

  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: true });

  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  // Smooth mouse wheel zoom
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!uniformCamera) return;
    uniformCamera.position.z += e.deltaY * 0.0025;
    uniformCamera.position.z = Math.max(3.0, Math.min(5.5, uniformCamera.position.z));
  }, { passive: false });
}

function onPointerDown(e) {
  isDragging = true;
  const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
  const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
  previousMousePosition = { x: clientX, y: clientY };
}

function onPointerMove(e) {
  if (!isDragging || !uniformModelGroup) return;

  const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
  const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

  const deltaX = clientX - previousMousePosition.x;
  const deltaY = clientY - previousMousePosition.y;

  // 360 Turntable rotation
  uniformModelGroup.rotation.y += deltaX * 0.008;

  // Subtle natural pitch
  uniformModelGroup.rotation.x += deltaY * 0.003;
  uniformModelGroup.rotation.x = Math.max(-0.20, Math.min(0.20, uniformModelGroup.rotation.x));

  previousMousePosition = { x: clientX, y: clientY };
}

function onPointerUp() {
  isDragging = false;
}

// -------------------------------------------------------------------------
// ANIMATION LOOP
// -------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  if (uniformModelGroup && isAutoRotating && !isDragging) {
    uniformModelGroup.rotation.y += 0.006;
  }

  if (uniformRenderer && uniformScene && uniformCamera) {
    uniformRenderer.render(uniformScene, uniformCamera);
  }
}

// -------------------------------------------------------------------------
// PUBLIC CONTROLS (Called from HTML Buttons)
// -------------------------------------------------------------------------
window.toggleUniformGender = function(gender) {
  currentUniformGender = gender;
  buildUniformModel(gender);

  const boyBtn = document.getElementById("uniformBoyBtn");
  const girlBtn = document.getElementById("uniformGirlBtn");
  const titleDisplay = document.getElementById("uniformTypeTitle");
  const descDisplay = document.getElementById("uniformTypeDesc");

  if (gender === "boy") {
    if (boyBtn) boyBtn.className = "px-4 py-2 rounded-xl text-xs font-bold bg-[#2589E8] text-white shadow-sm transition-all";
    if (girlBtn) girlBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all";
    if (titleDisplay) titleDisplay.textContent = "Boys Official Uniform (Class Prep - Matric)";
    if (descDisplay) descDisplay.textContent = "Pistachio Sage Green Collared Shirt, Forest Green & Gold Striped Necktie, Formal Khaki Trousers, Black Shoes.";
  } else {
    if (boyBtn) boyBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all";
    if (girlBtn) girlBtn.className = "px-4 py-2 rounded-xl text-xs font-bold bg-[#2589E8] text-white shadow-sm transition-all";
    if (titleDisplay) titleDisplay.textContent = "Girls Official Uniform (Class Prep - Matric)";
    if (descDisplay) descDisplay.textContent = "Pistachio Sage Green Pleated Kurti / Frock with Chest Crest, Beige Matching Shalwar/Trousers, Black Shoes.";
  }
};

window.toggleAutoRotate = function() {
  isAutoRotating = !isAutoRotating;
  const btn = document.getElementById("autoRotateBtn");
  if (btn) {
    btn.innerHTML = isAutoRotating ? 
      `<i data-lucide="pause" class="w-4 h-4"></i><span>Pause 360°</span>` : 
      `<i data-lucide="play" class="w-4 h-4"></i><span>Auto 360°</span>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
};

window.resetUniformView = function() {
  if (uniformModelGroup) {
    uniformModelGroup.rotation.set(0, 0, 0);
  }
  if (uniformCamera) {
    uniformCamera.position.set(0, 0.02, 4.30);
  }
};

window.openUniformModal = function() {
  const modal = document.getElementById("uniformModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(onWindowResize, 150);
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
};

window.closeUniformModal = function() {
  const modal = document.getElementById("uniformModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
};
