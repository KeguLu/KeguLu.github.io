---
id: area-01
title: FEM-Based Multistage Forming Design for Amplified Annealing-Induced Shape Change in AISI 420 Sheet
period: 2023-2025
status: published
papers:
  - id: paper-01
    title: A validated finite element model for designing a multistage forming process to enhance annealing-induced shape change in AISI 420 sheet
    venue: Materials & Design, vol. 261, 115375 (2026)
    doi: 10.1016/j.matdes.2025.115375
    url: https://doi.org/10.1016/j.matdes.2025.115375
repos:
  - name: internal — MSC Marc + Python calibration pipeline
    url: ""
    role: main
keywords:
  - multistage forming
  - annealing-induced shape change
  - residual stress
  - finite element modelling
  - AISI 420 stainless steel
  - constitutive model suite
  - simulation-driven design
  - Norton–Arrhenius creep
  - Hill48 anisotropy
aliases:
  - FEM
  - finite element method
  - finite element simulation
  - finite element modelling
  - finite element analysis
  - 有限元
  - 有限元模拟
  - demonstrator
  - design demonstrator
  - MSC Marc
  - MSC Mentat
  - multistage forming
  - 多阶段成形
  - annealing-induced shape change
  - 退火诱导形变
  - residual stress relaxation
  - 残余应力松弛
  - deep drawing
  - bottom stamping
  - flattening
  - AISI 420 sheet demonstrator
---

## Problem

Heat treatment of metallic components is essential for achieving target mechanical properties, but it also drives shape change that compromises the dimensional accuracy demanded by modern net-shape manufacturing. For thin AISI 420 sheet products this shape change is small in absolute terms — on the order of a few microns — yet still large enough to disqualify a part from precision applications. Crucially, around 70% of the total hardening-induced shape change occurs below 760 °C, prior to austenite formation, which means it is governed by the relaxation of forming-induced residual stress rather than by phase transformation. The annealing regime is therefore the right place to attack the problem.

The difficulty is that measurement reliability collapses at this scale. In a previously studied 0.35 mm AISI 420 cup the post-anneal shape change was around 4 µm, which is at the resolution limit of standard coordinate measuring machines and structured-light scanners. Sub-micron CT can resolve it, but is too slow and expensive for mass measurement, statistical parametric analysis, or design-of-experiments studies. As a consequence, neither FEM models nor causal hypotheses about which factors dominate the shape change can be tested rigorously against industrial-scale data.

The deeper challenge is that the shape change emerges from a chain of interacting physics across multiple processing stages: anisotropic plastic flow during forming, strain-rate-induced hardening, plastic heating, temperature-dependent elastic and plastic properties, and finally creep relaxation during annealing. A single-step model that omits any one of these underestimates the residual stress field and therefore the resulting distortion. What is needed is a validated multi-physics model suite plus a forming process specifically engineered to push the shape change above the measurement noise floor.

## Approach

**Core idea.** Build and validate a multi-physics FEM constitutive model suite for AISI 420 sheet, then use it in a "simulation-driven design" loop to engineer a new multistage forming process that intentionally amplifies the annealing-induced shape change from a few microns to tens of microns.

**Constitutive framework.** Total strain is decomposed as $\varepsilon_{\text{tot}} = \varepsilon_e + \varepsilon_p + \varepsilon_{cr} + \varepsilon_{\text{th}}$, and the flow stress is written as a multiplicative law that separates strain hardening, rate sensitivity, and thermal softening:

$$
\sigma_y = f(\varepsilon_p)\cdot g(\dot{\varepsilon}_p)\cdot h(T)
$$

Here $f$ is a Voce saturation law, $g$ is a power-law in plastic strain rate (calibrated $m = 0.0146$, reference rate $10^{-4}\,\text{s}^{-1}$), and $h$ is a sum-of-two-Gaussians fit to the temperature-dependent yield strength. The Gaussian-pair form was preferred over Johnson–Cook because the latter predicts an early steep drop inconsistent with the measured gradual loss below 600 °C and the accelerated drop above. Texture-induced anisotropy is captured with a Hill48 quadratic yield surface calibrated from r-values and yield strengths measured at 0°, 45°, and 90° to the rolling direction.

**Plastic heating and creep relaxation.** Because local plastic strain rates exceed 1 s⁻¹ in deep drawing, a Taylor–Quinney term

$$
\Delta T = \frac{\beta}{\rho c_p}\int \sigma\,d\varepsilon_p
$$

adds quasi-adiabatic heating into the energy balance, separating intrinsic rate sensitivity from heating-induced softening. During annealing, residual stress relaxation is modelled by a Norton law with Arrhenius temperature dependence:

$$
\dot{\varepsilon}_{cr} = C_{cr}\,\exp\!\left(-\tfrac{Q}{RT}\right)\sigma^{\,n_{cr}}
$$

calibrated against creep data at 500, 600, and 700 °C.

**Staged FEM workflow.** Rather than running the full forming-plus-annealing chain in one solve, the work uses MSC Marc's "Model Section" feature to checkpoint mesh and state variables between stages (deep drawing → bottom stamping → flattening → annealing). This lets one upstream solve feed many downstream variants — essential for the tooling-iteration study — and cleanly enables/disables behaviours per stage. For example, creep is disabled during forming and only activated during annealing.

**Simulation-driven tooling design.** Five bottom-stamping tool variants (varying ring count and ring heights) were evaluated against the same deep-drawing baseline. Each candidate was carried through bottom stamping, flattening, and annealing to compute its $|\Delta S|_{\max}$. The variant maximising shape change was selected as the new process and subjected to parametric sensitivity analysis on annealing temperature, sheet thickness, elastic modulus, and yield strength.

## Key Contributions

- A validated constitutive model suite for AISI 420 sheet that combines Voce hardening, power-law rate sensitivity, Hill48 anisotropy, Taylor–Quinney plastic heating, temperature-dependent $E$ and $Y$ (Gaussian-based softening), thermal expansion, and Norton–Arrhenius creep, with all parameters calibrated from in-house tensile and creep data.
- A staged FEM workflow built on MSC Marc's "Model Section" function that transfers mesh and state variables between forming and annealing stages, enabling efficient reuse of upstream solves across tooling iterations and clean per-stage activation of material behaviours.
- A novel three-step forming process — deep drawing + ring-corrugated bottom stamping + flattening — engineered to deliberately accumulate residual stress at the cup bottom; the optimised tooling (Case 2–2, two rings of unequal height) achieves a shape change of 47.3 µm, approximately a tenfold amplification over the ~4 µm of the prior process, pushing the response well above standard metrology noise.
- A mechanistic finding that annealing-induced shape change is *not* a monotonic function of residual stress magnitude alone: the pre-anneal bottom geometry (convex vs. concave) and the radial stress component $\sigma_{11}$ jointly determine the direction and magnitude of edge motion. Cases with higher mean residual stress can produce smaller shape changes when the $\sigma_{11}$ distribution shifts toward tension.
- A methodological shift from "design first, validate later" to "validate first, then design": the model suite is first benchmarked against an existing 0.35 mm AISI 420 process before being applied to design the new 0.2 mm process, raising predictive confidence for the design phase.

## Results

Validation against the prior 0.35 mm AISI 420 process reproduced both the deep-drawing earing profile (peak height at 90° to RD, with a small mid-angle deviation reflecting Hill48's quadratic limits) and the temperature dependence of the post-anneal shape change. Simulated values at 300, 400, 500, 600, and 760 °C all fell within the experimental box-whisker spread, including the plateau between 600 and 760 °C that follows from near-complete stress relief by 600 °C.

For the newly designed 0.2 mm process, the optimised Case 2–2 tooling yields a maximum absolute shape change $|\Delta S|_{\max} = 47.3\,\mu\text{m}$. The five evaluated variants spanned 21.0 µm (Case 1–3, with opposite sign because the bottom is initially convex) up to 47.3 µm (Case 2–2). This represents an order-of-magnitude amplification over the ~4 µm of the validation benchmark — large enough to be measured reliably with standard laboratory metrology and to support statistical parametric studies. Tracking the residual stress field through the full annealing cycle for Case 2–2 confirms that almost all of the relaxation happens during heating: by 760 °C the bottom-region residual stress is essentially zero, and the subsequent 900 s hold and 6 °C/s cooldown leave it near zero, so the cooldown rate does not re-introduce significant stress.

Diagnostic stress fields show that during deep drawing local plastic strain rates reach roughly 10 s⁻¹ at the wall and bending region, justifying the inclusion of rate sensitivity: switching the rate term on raises peak von Mises stress from 702 to 827 MPa (~14% increase), which propagates directly into the post-forming residual stress field that drives the anneal distortion.

Parametric sweeps on the optimised process identify annealing temperature and sheet thickness as the dominant factors. Across the standard ±0.01 mm thickness tolerance (0.19–0.21 mm) the cup bottom can flip from convex to concave and $|\Delta S|_{\max}$ swings from –16.6 µm at 0.19 mm up to +47.3 µm at 0.2 mm. Elastic modulus and yield strength variations of ±20% change $|\Delta S|_{\max}$ by only a few microns each, marking them as secondary factors.

## Implementation Notes

**Stack.** MSC Marc 2023.2 as the FEM solver; MSC Mentat for pre/post-processing, including its embedded "Experimental Data Fit" module for Hill48 coefficient calibration. Python with SciPy for non-linear least-squares fitting of the Voce, rate-power-law, Gaussian-pair thermal-softening, and Norton–Arrhenius creep parameters. ARAMIS DIC for full-field strain measurement in tensile experiments; Lankford r-values computed by linear regression of $\varepsilon_{22}$ vs $\varepsilon_{11}$ over the 9–11% strain band per ISO 10113:2006.

**Geometry and meshing.** The validation case used a 3D quarter-cup model with cyclic-symmetry boundary conditions to capture earing. The design and parametric studies used a 2D axisymmetric model with 4-node axisymmetric quadratic elements: 15 through-thickness, 300 radial in 0–10 mm, and 75 radial in 10–17.5 mm, totalling 5625 elements. The resolution was chosen via a mesh-convergence study starting from a baseline of 5 through-thickness and 100 radial elements; the maximum von Mises stress during forming stabilises at refinement ratios ≥ 3× the baseline, so the 3× mesh (15 × 300) is the accuracy/cost knee. Tools are modelled as rigid bodies. Global remeshing was disabled.

**Process-parameter calibration.** The blank holder force (BHF) was set numerically rather than guessed. With a die-to-blank-holder clearance of $D_{bd} = 1.15t$, the flange thickens during draw and exceeds the clearance, jamming against the die — visible in the FEM as a high compressive stress band at the blank edge. Increasing $D_{bd}$ to $1.2t$ leaves a small gap near the edge, and the blank-holder reaction force history then peaks at 3.97 kN. The simulation BHF was set to 4.2 kN, ~5% above this peak, to provide a safety margin without re-introducing the jam. The drawing ratio of 1.62 sits comfortably below the 1.72–1.80 limit for this geometry per Romanovski's handbook; die edge radius was set to ~5–9$t$ and punch edge radius to $1.5\,r_d$ from the same source.

**State-variable staging.** The "Model Section" function checkpoints both the deformed mesh and the state variables ($\varepsilon_e$, $\varepsilon_p$, $\dot{\varepsilon}_p$, $\varepsilon_{\text{th}}$, $T$, and from annealing onward $\varepsilon_{cr}$) at the end of each simulation; the next stage starts from that checkpoint. This is what makes a single deep-drawing solve reusable across five bottom-stamping cases, and what allows creep to be activated only during the annealing stage rather than carried as deadweight through forming.

**Numerical considerations.** Strain-rate calibration tests were restricted to $10^{-4}$–$2\times10^{-3}\,\text{s}^{-1}$ to stay within the isothermal regime and decouple intrinsic rate sensitivity from plastic-heating-induced softening; the latter is then re-introduced via the Taylor–Quinney term. Voce hardening was preferred over Hollomon/Ludwik based on prior fitting work in the group. The Gaussian-pair $h(T)$ was preferred over Johnson–Cook for its accuracy in the low-to-moderate temperature regime where Johnson–Cook over-predicts early softening.

**Calibration parameter sets — what changes between sheets.** Two parameter sets were calibrated: one for the 0.35 mm validation sheet (from earlier in-house work) and one for the 0.2 mm design sheet (the focus of this paper). Both sheets come from Alleima's 6C27 product line via the same processing route, differing only in final thickness, so the *thermal and creep* parameters — temperature-dependent $E$ slope $A_E$, the Gaussian-pair $Y(T)$ shape coefficients, $\rho$, $c_p$, $\beta$, $\alpha_L$, and the Norton–Arrhenius constants $C_{cr}=0.1$, $n_{cr}=4$, $Q=2.07\times10^{5}\,\text{J/mol}$ — are reused unchanged. What differs are the cold-work-sensitive mechanical parameters: $E$ is 215 GPa for the 0.35 mm sheet vs 230 GPa for the 0.2 mm sheet; initial yield $Y$ is 366 vs 322 MPa; Voce hardening capacity $K$ and rate $b$ shift from 258 MPa, 22.8 to 397 MPa, 14.9 (reflecting more residual cold-work in the thinner sheet); and Hill48 anisotropy $r_0/r_{45}/r_{90}$ moves from 1.35/1.17/1.81 to 1.52/1.37/2.35. The strain-rate exponent $m = 0.0146$ is the same for both. This split — share what the processing route fixes, recalibrate what the thickness-dependent rolling history changes — is what makes it defensible to transplant the validated model from the 0.35 mm benchmark to the 0.2 mm design sheet.

**Validation criterion.** "Correct" in this domain means simultaneously matching (i) the earing profile after deep drawing and (ii) the temperature-dependent shape change $\Delta S$ at fixed measurement radii ($r_1 = 7$ mm, $r_2 = 9$ mm in the validation case). Both must fall within the experimental scatter across the 300–760 °C annealing range.

**Performance strategy.** The two-phase approach — validate on the 0.35 mm benchmark in 3D, then design on the 0.2 mm sheet in 2D axisymmetric — is itself the main performance optimisation. It avoids running multiple full 3D multistage chains during tooling iteration. Combined with mesh checkpointing via "Model Section," this is what makes the five-variant tooling sweep plus full parametric analysis tractable.

## Related Work & Positioning

Earlier work in our group on the same 0.35 mm AISI 420 sheet (Groen et al., Zijlstra et al.) established that residual stress relaxation, not phase transformation, dominates sub-critical shape change, and combined elastic–plastic, anisotropy, temperature-dependent $E$, and creep into a working FEM. The present work extends that line by adding strain-rate sensitivity and plastic heating — both non-negligible at the deep-drawing rates of 1–10 s⁻¹ that occur in this geometry — and by switching from Johnson–Cook to a two-Gaussian thermal-softening law that better fits the measured $Y(T)$ curve.

Creep-based modelling of relaxation has a long lineage in adjacent fields: Rong et al. on stress-relaxation age forming of AA6082, Odenberger et al. on thermo-mechanical Ti-6Al-4V forming, Ho et al. on creep forming of thick aluminium, and more recently Li et al. on microstructure-informed creep–viscoplasticity for hot bending of titanium. Those works use creep to describe deformation under externally applied loads. The present work uses it to describe relaxation of *internal* residual stress between forming stages, and treats interaction across the multistage chain rather than a single step. A microstructure-informed creep law would be more physically faithful but was deliberately avoided here for convergence and cost reasons given the volume of design iterations required.

The closest comparable work in goal uses FEM to design forming processes that *minimise* distortion (Sun et al. on hypoid gears, Dong et al. on inherent-strain compensation in laser powder bed fusion). The present work inverts the objective: it amplifies the shape change to make it measurable and statistically tractable. It also reorders the methodology from "design then validate" to "validate then design," with the 0.35 mm benchmark serving as a confidence anchor before any new tooling is proposed.

## Open Questions / Future Directions

- The experimental campaign verifying the predicted ~47 µm shape change on physical 0.2 mm cups is currently in progress; the simulation prediction has not yet been confirmed by measurement on the new geometry, and the variation analysis that motivated the amplification is the next step.
- Hill48 shows a visible deviation from the measured ear height around the 45° trough. A higher-order yield function (e.g., Barlat-type) would improve formability prediction at the cost of more parameters; this was traded off against simulation cost in the current work.
- The Norton–Arrhenius creep law is intentionally simple. Replacing it with a microstructure-informed unified creep–viscoplasticity model (with explicit dislocation density, recrystallisation, and grain growth) would link relaxation to underlying mechanisms but at substantial convergence and runtime cost.
- The parametric finding that thickness is the dominant intrinsic factor needs to be replicated against measured cup-to-cup variation once the experimental campaign produces a population — which is, in turn, the main motivation for amplifying the shape change in the first place.
