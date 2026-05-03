---
id: 02-CP-Simulation
title: Investigating carbide characteristics effect on multiscale mechanical behavior of AISI 420 steel using crystal plasticity simulation
period: 2022-2023
status: published
papers:
  - id: paper-01
    title: Investigating carbide characteristics effect on multiscale mechanical behavior of AISI 420 steel using crystal plasticity simulation
    venue: Journal of Materials Research and Technology, 2025
    doi: 10.1016/j.jmrt.2025.05.235
    url: https://doi.org/10.1016/j.jmrt.2025.05.235
repos:
  - name: CP-Tensile-Different-Directions-Dream3D
    url: https://github.com/KeguLu/CP-Tensile-Different-Directions-Dream3D
    role: main
    scope: |
      Implementation of the direction-dependent virtual tensile testing method
      (combined geometry + orientation rotation). Covers: master RVE construction
      and geometric rotation at arbitrary angle θ, Euler angle transformation of
      grain orientations, driving DAMASK simulations across the 7 tensile
      directions, and post-processing to extract stress-strain curves and r-values.
  - name: PSO-CP-Callibration-Params
    url: https://github.com/KeguLu/PSO-CP-Callibration-Params
    role: main
    scope: |
      This repository contains a Python workflow for calibrating crystal plasticity constitutive parameters using particle swarm optimization (PSO) for DAMASK full-field simulations. The workflow is designed for a multiphase representative volume element (RVE) of annealed AISI 420 stainless steel, where the ferritic matrix and carbide phase are described by separate material phase files.
keywords:
  - Crystal plasticity
  - AISI 420 stainless steel
  - Carbide characteristics
  - Representative volume element (RVE)
  - Anisotropic behavior
  - Lankford coefficient (r-value)
  - Calibration of constitutive parameters
  - Particle swarms optimization (PSO)
  - DAMASK
  - DREAM.3D
---

## Problem

AISI 420 stainless steel is widely used in cutlery, surgical equipment, and gears because, in its annealed state, it combines good ductility for sheet-metal forming with the ability to be hardened to high strength and corrosion resistance through subsequent heat treatment. The annealed microstructure is a ferritic matrix interspersed with carbides (M23C6 and MX). The volume fraction, size, number, and spatial distribution of these carbides are set by the prior heat treatment and directly control macroscale responses that matter for forming — the stress-strain curve, the work-hardening rate, and the anisotropic behavior described by the Lankford coefficient (r-value). These are the same quantities that finite-element forming simulations need as inputs to predict product geometry, springback, and tooling forces.

The specific gap addressed here is that earlier crystal-plasticity studies on AISI 420 each looked at only one mechanical property or one carbide attribute in isolation. Hidalgo et al. [1] examined carbide-induced local strain heterogeneity, Galán-López and Hidalgo [2] focused on realistic texture generation for RVEs, and Vittorietti et al. [45] studied carbide volume fraction's effect on work-hardening alone. A broad CP investigation that varies several carbide characteristics jointly — fraction at grain boundaries (GBs), number, average size, and volume fraction — and relates all of them to the full set of mechanical responses (tensile curve, work-hardening, anisotropy, micromechanical fields) was still missing.

The problem is hard for two reasons. First, experimental techniques (SEM, EBSD, TEM, DIC) can observe local mechanisms but are expensive, time-consuming, limited to nano-to-micrometer fields of view, and cannot cleanly isolate the contribution of carbides from the complex steel microstructure [27]. Second, continuum precipitation-strengthening models (shear-lag, Orowan, Eshelby-type) predict bulk behavior from microstructural statistics but do not expose local inhomogeneous strain and stress distributions [10,13,16]. A scale-bridging CP-RVE approach is therefore needed.

## Approach

**Core idea.** Build a validated multiphase CP-RVE model of annealed AISI 420 steel in DAMASK, then systematically vary carbide characteristics one at a time — while holding the ferrite microstructure fixed — to isolate each carbide parameter's effect on macroscale (stress-strain, r-value) and microscale (local strain, stress, r-value fields) mechanical behavior.

**Finite-strain CP theory.** The deformation gradient is decomposed multiplicatively into elastic and plastic parts:

$$
\mathbf{F} = \mathbf{F}^e \mathbf{F}^p
$$

The elastic response is written in terms of the 2nd Piola-Kirchhoff stress $\mathbf{S}$ and the Green–Lagrange strain $\mathbf{E}$:

$$
\mathbf{S} = \mathbb{C} : \mathbf{E}, \quad \mathbf{E} = \tfrac{1}{2}\left(\mathbf{F}^e{}^\top \mathbf{F}^e - \mathbf{I}\right)
$$

For cubic crystals, $\mathbb{C}$ is specified by $C_{11}, C_{12}, C_{44}$. Plastic deformation is driven by dislocation slip, with plastic velocity gradient:

$$
\mathbf{L}^p = \sum_\alpha \dot{\gamma}^\alpha (\mathbf{m}^\alpha \otimes \mathbf{n}^\alpha)
$$

**Phenomenological hardening law (phenopowerlaw).** The slip rate on system $\alpha$ follows a power law in the resolved shear stress $\tau^\alpha$ relative to a critical value $\tau_C^\alpha$:

$$
\dot{\gamma}^\alpha = \dot{\gamma}_0 \left|\frac{\tau^\alpha}{\tau_C^\alpha}\right|^n \mathrm{sign}(\tau^\alpha)
$$

The critical stress evolves through self- and latent-hardening interactions:

$$
\dot{\tau}_C^\alpha = \sum_\beta h^{\alpha\beta} |\dot{\gamma}^\beta|, \quad h^{\alpha\beta} = q^{\alpha\beta}\left[h_0\left(1 - \frac{\tau_C^\beta}{\tau_{\mathrm{sat}}}\right)^a\right]
$$

where $q^{\alpha\beta} = 1.0$ for coplanar systems and $1.4$ otherwise, and $h_0, \tau_{\mathrm{sat}}, a$ are the initial hardening modulus, saturation stress, and a fitting exponent. This is the simple phenopowerlaw — intentionally chosen for tractability over physics-based laws that would add complexity without matching the scope of this study.

**RVE construction (DREAM.3D).** Two RVEs are built from SEM+EBSD characterization of the as-received sheet:
- **RVE_Opt** — $30\times30\times30\,\mu\mathrm{m}^3$, $50^3$ voxels, 319 ferrites, 253 carbides. Used for iterative parameter calibration where speed matters.
- **RVE_Base** — $36\times36\times36\,\mu\mathrm{m}^3$, $120^3$ voxels, 649 ferrites, 8600 carbides, grid size $0.3\,\mu\mathrm{m}$ (smaller than most measured carbides). Used as the validated reference for all subsequent studies.

Ferrite grains are BCC with grain-size log-normal statistics ($\mu_\text{size}=1.17, \sigma_\text{size}=0.72$, mean $4.1\,\mu\mathrm{m}$) and orientations sampled from the experimental ODF (a typical $\gamma$-fiber with $\{111\}_{\mathrm{bcc}} \parallel$ RD-TD plane). Carbides use log-normal size statistics ($\mu_\text{size}=-0.64, \sigma_\text{size}=0.33$, mean $0.56\,\mu\mathrm{m}$), random orientations, total volume fraction 4.2%, and 53% of them located at ferrite GBs (value consistent with Hidalgo et al. [1] for the same steel). The nearest-neighbor index of 1.1 confirms the spatial distribution is Poisson (complete spatial randomness). Carbides are treated as perfectly bonded, roughly spherical (mean aspect ratio 1.5), and non-shearable.

**Parameter calibration via particle swarm optimization.** Elastic constants and $\dot{\gamma}_0, n$ for ferrite are taken from the literature [2]. The four remaining plastic parameters $(\tau_{C,0}, \tau_{\mathrm{sat}}, h_0, a)$ are calibrated by matching the simulated uniaxial tensile curve to the experimental one using PSO (via PySwarms). The loss is the RMS deviation

$$
d = \sqrt{\frac{\sum_i (\sigma_i^e - \sigma_i^s)^2}{\sum_i (\sigma_i^e)^2}}
$$

evaluated on 20 particles × 25 iterations. Calibration converges at iteration 24 to $\tau_{C,0}=94\,\mathrm{MPa}$, $\tau_{\mathrm{sat}}=241\,\mathrm{MPa}$, $h_0=2.39\,\mathrm{GPa}$, $a=1.94$.

**Virtual tensile tests at different directions — the novel contribution.** Specimens are cut experimentally at seven angles ($\theta = 0°, 15°, 30°, 45°, 60°, 75°, 90°$) relative to RD. To replicate this faithfully in simulation, a two-step procedure is applied:

1. **Geometry rotation.** Following the three-step method of Solhjoo et al. [60], a master RVE is built by tiling the base RVE with eight replicas in the RD-TD plane. The master RVE is rotated by $\theta$, and a new RVE of the original size is cut from the rotated master. This replaces the specimen with one whose geometry correctly reflects the cutting angle.
2. **Orientation transformation.** Each grain's Euler angles $\{\varphi_1, \Phi, \varphi_2\}$ are updated to $\{\varphi_1 - \theta, \Phi, \varphi_2\}$ (Bunge convention, in-plane rotation from RD to TD). The simulation coordinate system $(x,y,z)$ stays fixed, so the same periodic boundary conditions can be reused across all seven directions.

Prior studies [35,36,53] performed only the orientation transformation and kept the geometry fixed. Transforming both geometry and orientations is the methodological innovation and is what enables the anisotropy to be captured realistically.

**Simulation suite.** Four controlled-variable cases, 23 RVEs total, 7 tensile directions each → **161 virtual tensile tests** on the Hábrók HPC cluster at the University of Groningen:

- **Case 1** — carbide fraction at GBs varied (0, 20, 40, 53, 60, 80, 100%) with other carbide stats fixed
- **Case 2** — carbide number varied (2150 → 10750) with volume fraction fixed at 4.2%, forcing average size to vary inversely via $v_{\mathrm{carbide}} = \frac{\pi}{6} n_{\mathrm{carbide}} d_{\mathrm{carbide}}^3$
- **Case 3** — volume fraction varied (0–12%) by changing carbide number at fixed $d = 0.56\,\mu\mathrm{m}$
- **Case 4** — volume fraction varied (0–12%) by changing average size at fixed number 8600

To ensure cases share identical ferrite microstructure, each ferrite grain's centroid, principal semi-axes, omega-3 value, and Euler angles are exported from RVE_Base to an ASCII file and re-imported into every subsequent RVE via DREAM.3D's "Pack Primary Phases → Already have features" option. Carbides are then inserted with "Insert Precipitate Phases".

## Key Contributions

- **Methodological: realistic direction-dependent virtual tensile testing.** Introduced the combined geometry + orientation rotation scheme for CP-RVE virtual tensile tests at different directions, replacing the incomplete orientation-only rotation used in prior work [35,36,53]. This is the core contribution implemented in the public `CP-Tensile-Different-Directions-Dream3D` repository.
- **Broad multi-parameter carbide study.** First systematic CP-RVE study of AISI 420 steel that jointly varies four carbide characteristics (fraction at GBs, number, size, volume fraction) across 23 RVEs and 161 virtual tests, relating each to full stress-strain, work-hardening, anisotropy, and micromechanical field responses.
- **PSO-CP-Callibration-Parameters.** The main idea is to search for ferrite crystal plasticity parameters that minimize the deviation between simulated and experimental stress-strain curves. 
- **Empirical engineering equations.** Derived a linear relationship $Y = 0.0618\,X + 298.6$ (yield strength in MPa vs carbide fraction at GBs in %) and extended the Voce strain-hardening model into a closed-form prediction for tensile curves at arbitrary carbide volume fraction $V_{\mathrm{carbide}}$:
  - $Y = Y_0[1 + S\,V_{\mathrm{carbide}}] + Y_0(1 - V_{\mathrm{carbide}})$ with $Y_0 = 288.5\,\mathrm{MPa}, S = 0.98$ (shear-lag form)
  - $\sigma_s = 1472\,V_{\mathrm{carbide}} + 686$
  - $\varepsilon_c = -0.0897\,V_{\mathrm{carbide}} + 0.0663$
  
  feeding into $\sigma(\varepsilon_p) = \sigma_s - (\sigma_s - Y)\exp(-\varepsilon_p / \varepsilon_c)$.
- **Quantitative micromechanical insights.** Showed via box-whisker statistics across 0–12% $V_{\mathrm{carbide}}$ that increasing $V_{\mathrm{carbide}}$ (i) widens the statistical spread of true strain and stress in both ferrites and carbides, (ii) intensifies strain concentration specifically in carbides, and (iii) reduces r-value mainly through ferrite-phase r-value reduction, not through carbides. Kruskal–Wallis $p < 0.001$ on all trends.

## Results

**Calibration and validation.** The PSO-calibrated CP model reproduces the experimental tensile curve of annealed AISI 420 steel over $0 \le \varepsilon_p \le 0.2$ with only a small discrepancy near yield (from Lüders-band behavior the phenopowerlaw cannot capture). RVE_Base gives slightly higher stress than RVE_Opt due to its finer grid resolving smaller carbides. The RVE_Base pole figure and ODF reproduce the experimental $\gamma$-fiber texture, with max ODF intensity 4.4 vs 4.1 experimentally — somewhat sharper because RVE_Base has fewer grains than the EBSD area.

**Anisotropy prediction (r-values).** Across the seven tensile directions, simulated and experimental r-values follow the same trend: r-values rise from ~1.5 at 0°, dip to ~1.2–1.3 at 30–45°, and climb to ~2.4–2.6 at 90°. All r-values exceed 1, indicating strong resistance to thinning. Simulation shows slightly stronger anisotropy than experiment due to the slightly sharper RVE_Base texture. Average normal anisotropy $\bar{r} = 1.74$, planar anisotropy $\Delta r = 0.691$ — favorable for deep drawing but prone to earing in cup forming.

**Case 1 — Carbide fraction at GBs.** r-values are essentially unchanged (texture is the dominant control; carbides are random-oriented and only 4.2% volume). Yield strength rises linearly from ~298.5 MPa at 0% to ~300.5 MPa at 100% GB-carbide fraction, matching Daigne et al.'s theory [13] of enhanced GB shear resistance. Fitted: $Y = 0.0618\,X + 298.6$.

**Case 2 — Carbide number at fixed volume fraction.** Stress-strain curves and yield strength vary by less than 0.5% as carbide number increases from 2150 to 10750 (with mean size decreasing from 0.889 to 0.520 μm). This diverges from classical Orowan prediction (strength inversely proportional to inter-particle spacing) because the phenopowerlaw does not embed an Orowan bypass term. Capturing Orowan would require coupling with discrete dislocation dynamics [74] or adding a physics-based hardening term [42] — flagged as future work.

**Case 3 & 4 — Carbide volume fraction (0 → 12%).**
- r-values drop at all tensile directions as $V_{\mathrm{carbide}}$ rises, with the strongest reduction at 90° and the smallest at 45°. The direction of minimum r-value shifts from 45° toward 30°, which would change ear profiles in cup forming.
- Both $\bar{r}$ and $\Delta r$ decrease with $V_{\mathrm{carbide}}$ — planar anisotropy shrinks (less earing) but drawability suffers.
- Yield strength increases linearly with $V_{\mathrm{carbide}}$; shear-lag form $Y = Y_0[1 + S\,V_{\mathrm{carbide}}] + Y_0(1-V_{\mathrm{carbide}})$ with $Y_0 = 288.5\,\mathrm{MPa}, S = 0.98$ fits the CP data well.
- Strain-hardening rate curves show a two-stage response: steep drop up to $\varepsilon_p \approx 0.1$ (long-range back-stress / GND-driven), then a gradual plateau (short-range dislocation interactions dominant). Carbides amplify hardening most in the early stage.
- Comparison of six strain-hardening models (Hollomon, Ludwik, Voce, Lavakumar, Dimatteo, Gonoring): Voce gives the smallest error among classical laws (0.029 vs 0.034 / 0.055), and is chosen for the downstream empirical framework because its three parameters $(Y, \sigma_s, \varepsilon_c)$ each have direct physical meaning. Recent models (Lavakumar 0.0006, Gonoring 0.0031) fit slightly better but have more parameters without physical interpretation for this purpose.

**Micromechanical analysis (at $\varepsilon_p = 0.1$).** Contour maps show:
- Strain localizes at ferrite GBs (due to orientation mismatch) for $V_{\mathrm{carbide}}=0$; adding carbides (4.2%) introduces additional strain hotspots around carbides in the ferrite, while carbides themselves remain low-strain because they are elastically stiff.
- Stress hotspots migrate into the carbides at 4.2% — carbides carry disproportionately high stress.
- r-value is highly inhomogeneous at the grid level: most grids have r < 1, but a small fraction have r > 10 concentrated at consistent hotspot locations across RVEs.

Box-whisker statistics confirm: as $V_{\mathrm{carbide}}$ rises 0 → 12%, the IQR of true strain widens in both phases (especially carbides — mean-median skew widens), true stress in carbides rises faster than in ferrites (carbides take more load), and ferrite r-value distributions narrow. The overall r-value decrease with $V_{\mathrm{carbide}}$ is driven by the ferrite-phase r-value decrease; carbides contribute marginally. All trends have Kruskal–Wallis $p < 0.001$.

## Implementation Notes

**Stack.** Python 3.x, NumPy, SciPy, pandas, matplotlib, h5py, DAMASK (crystal-plasticity FFT solver), DREAM.3D (RVE construction), PySwarms (PSO for parameter calibration). Utility modules use `sys`, `os`, `csv`. Ran on the Hábrók HPC cluster at University of Groningen.

**Data formats.**
- DREAM.3D pipelines produce `.dream3d` files (HDF5-based) containing voxelized microstructures with phase and orientation fields.
- DAMASK reads geometry as `.vti` / `.hdf5` and material config via YAML (`material.yaml`); writes simulation results as HDF5 with datasets per increment for stress, deformation gradient, crystallographic orientation, and slip-system state.
- Ferrite grain features for cross-RVE consistency are exported as ASCII (centroids, major/mid/minor principal semi-axis lengths, omega-3 value, Euler angles) and re-imported into subsequent DREAM.3D pipelines.
- Post-processing extracts tensile curves and per-voxel $\varepsilon_{22}, \varepsilon_{33}$ fields for r-value computation.

**Numerical considerations.**
- RVE_Base grid spacing $0.3\,\mu\mathrm{m}$ is deliberately smaller than the mean carbide diameter ($0.56\,\mu\mathrm{m}$) to resolve carbides properly without spurious merging.
- RVE_Opt's coarser $0.6\,\mu\mathrm{m}$ grid excludes sub-grid carbides, causing a small (but real) stress-strain offset vs RVE_Base — acceptable for calibration speed.
- Periodic boundary conditions in DAMASK's FFT solver are applied via the mixed $\dot{\mathbf{F}}$ / $\mathbf{P}$ boundary condition: $\dot{F}_{11}$ prescribed (strain-controlled in loading direction), other diagonal $F$ components free, off-diagonal $P$ components zero.
- Loading is split: 30 increments for the elastic regime ($0 \to 0.004$), 60 increments for plastic ($0.004 \to 0.2$), with $\dot{F}_{11}$ matched to the experimental strain rate $10^{-4}\,\mathrm{s}^{-1}$.
- Carbides' low-strain regime is respected by adopting elastic constants from Liu et al. [9] and a high hardening rate consistent with Hidalgo et al. [1].

**Performance and parallelization.** All 161 simulations distributed across HPC nodes. PSO calibration is the main computational bottleneck — 20 particles × 25 iterations = 500 CP simulations on RVE_Opt. Running calibration on RVE_Opt rather than RVE_Base is the key performance decision; final validation uses RVE_Base.

**Testing / correctness criteria.**
- Calibration quality: RMS deviation $d$ (Eq. 8) between simulated and experimental tensile curves in $0.004 \le \varepsilon \le 0.2$.
- Texture validation: qualitative PF/ODF match vs EBSD + max ODF intensity comparison.
- Anisotropy validation: simulated r-values at seven directions vs experimental r-values from DIC on dog-bone specimens ($11.5\,\mathrm{mm}$ gauge, $0.2\,\mathrm{mm}$ thick, $0.2\%$ offset yield, r-value from ISO 10113:2006 via $r = -m/(1+m)$ fit on the $\varepsilon_{11} \in [9\%, 11\%]$ strain window).
- Statistical significance of micromechanical trends: Kruskal–Wallis test, $p < 0.05$ threshold.

**Non-obvious implementation decisions.**
- *Re-using identical ferrite microstructure across all RVEs.* Export/re-import of ferrite grain features ensures that any observed mechanical-property difference is attributable to carbide variation, not ferrite sampling variance.
- *Area fraction as proxy for volume fraction.* Carbides are assumed spherical and uniformly distributed; 2D area fraction from SEM ≈ 3D volume fraction. Consistent with [45,59].
- *Ignoring carbon depletion in ferrite as $V_{\mathrm{carbide}}$ grows.* Real chemistry would reduce solid-solution strengthening; the study holds ferrite constitutive parameters fixed to isolate the carbide effect. Acknowledged as a limitation.
- *Plate/needle-shaped carbide morphology not modeled.* All carbides assumed spherical and perfectly bonded; interface cracking excluded.

**Public code scope.** The companion GitHub repository [`CP-Tensile-Different-Directions-Dream3D`](https://github.com/KeguLu/CP-Tensile-Different-Directions-Dream3D) implements the core methodological contribution — direction-dependent virtual tensile testing via combined geometry and orientation rotation. It covers:

1. Construction of the master RVE (tiling the base RVE with eight replicas in the RD-TD plane) and geometric rotation at arbitrary angle $\theta$.
2. Euler angle transformation of all grain orientations: $\{\varphi_1, \Phi, \varphi_2\} \to \{\varphi_1 - \theta, \Phi, \varphi_2\}$.
3. Driving DAMASK simulations across all 7 tensile directions ($\theta = 0°, 15°, 30°, 45°, 60°, 75°, 90°$) with consistent periodic boundary conditions.
4. Post-processing DAMASK HDF5 output to extract stress-strain curves and compute r-values at $\varepsilon_p = 0.1$ via $r = \bar{\varepsilon}_{22} / \bar{\varepsilon}_{33}$.

**Not included in the public repository** (described in the paper but kept private): the PSO-based constitutive parameter calibration pipeline using PySwarms + DAMASK (paper Section 4.1), the DREAM.3D pipelines for generating the 23-RVE carbide variation suite (Sections 3.2–3.3), and the non-linear least-squares fitting scripts for the shear-lag yield strength model and the Voce-based strain-hardening empirical model (Section 4.5.1). When asked about implementation details for these components, reference the methodology described in the paper rather than fabricating concrete code.

## Related Work & Positioning

*CP studies on AISI 420 specifically.* Hidalgo et al. [1] first applied phenomenological CP to AISI 420 to study carbide-induced heterogeneous strain; they validated texture and local KAM maps but looked at a single microstructure. Galán-López and Hidalgo [2] focused on the RVE texture generation strategy. Vittorietti et al. [45] studied carbide volume fraction's effect on work-hardening alone, using functional principal component analysis. The present work is the first to cover four carbide characteristics jointly and link them to the full set of responses (tensile curve, work-hardening, anisotropy, micromechanical fields) within a single validated framework.

*Direction-dependent virtual tensile testing in CP-RVE.* Zhang et al. [35], Li et al. [36], and Ma et al. [53] all performed virtual tests at multiple tensile directions by rotating only the crystallographic orientations while keeping the RVE geometry fixed. This is geometrically inconsistent with the experimental practice of cutting specimens at different angles from the sheet. The present work adopts the three-step geometric rotation scheme of Solhjoo et al. [60] and combines it with orientation rotation, producing the more faithful replication that the repository `CP-Tensile-Different-Directions-Dream3D` implements.

*Precipitation-strengthening models.* Classical continuum models (shear-lag [10], Daigne's GB-carbide model [13], Orowan-based [16]) predict bulk strengthening from microstructural statistics but give no local field information. Dislocation-dynamics approaches [17,38,39] resolve precipitate-dislocation interactions but are expensive and limited in domain size. CP-PF coupling [43,44] captures precipitation evolution and mechanical response together but adds substantial complexity. The CP-RVE approach adopted here sits in the middle: it resolves grain-scale heterogeneity without needing explicit dislocation modeling, and its simplicity makes systematic parameter studies (23 RVEs, 161 virtual tests) computationally feasible.

## Open Questions / Future Directions

- **Orowan bypassing not captured.** The phenopowerlaw treats carbides as non-shearable stiff inclusions but has no inter-particle-spacing term. Extending $\tau_C^\alpha$ with a physics-based Orowan contribution (derivable from DDD simulations [42,74]) would recover the expected strengthening scaling with carbide number at fixed $V_{\mathrm{carbide}}$, and is the most natural next step.
- **Lüders-band plateau not modeled.** The small discrepancy near yield comes from the phenopowerlaw's lack of nonlocal / band-formation physics. A strain-gradient or explicit nucleation-propagation model would close this gap.
- **Ferrite chemistry held constant.** Increasing $V_{\mathrm{carbide}}$ depletes carbon from ferrite, which should reduce solid-solution strengthening. A CP–PF coupling [43,58] would let ferrite constitutive parameters evolve with the carbide fraction self-consistently.
- **Carbide morphology simplified.** Real M23C6 / MX carbides are often plate- or needle-shaped and can fracture during deformation. Incorporating non-spherical morphology, interface damage, and debonding would be necessary for failure prediction.
- **Microscale validation.** Current validation is at the macroscale (tensile curves, r-values, texture). Direct comparison against experimental high-resolution DIC or KAM strain fields at the grain scale would strengthen confidence in the predicted micromechanical inhomogeneity.
