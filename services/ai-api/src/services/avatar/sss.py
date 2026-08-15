"""X5 Subsystem 2 — subsurface scattering skin parameters.

Computes per-channel skin optical properties from a two-layer (epidermis /
dermis) tissue model and converts them into the diffusion-profile parameters a
renderer needs.  Everything here is closed-form and runs on CPU.

Units
-----
The published fits below are all stated in **1/cm**; every coefficient this
module returns is converted to **1/mm** so that it composes directly with the
millimetre tissue thicknesses a renderer works in.

Model
-----
Absorption, epidermis — melanin plus baseline tissue (Jacques 1998)::

    mu_a_melanin(L)  = 6.6e11 * L ** -3.33            [1/cm]
    mu_a_baseline(L) = 0.244 + 85.3 * exp(-(L - 154) / 66.2)   [1/cm]
    mu_a_epi         = Cm * mu_a_melanin + (1 - Cm) * mu_a_baseline

Absorption, dermis — haemoglobin at oxygen saturation ``S``::

    mu_a_derm = Ch * (S * mu_a_oxy + (1 - S) * mu_a_deoxy) + (1 - Ch) * baseline

Reduced scattering — combined Mie and Rayleigh terms (Jacques 2013), fitted
for skin at 46 /cm at 500 nm::

    mu_s_prime(L) = a * (L / 500) ** -b               [1/cm]

Diffusion — Jensen et al. 2001, "A Practical Model for Subsurface Light
Transport"::

    alpha' = mu_s' / (mu_a + mu_s')
    Fdr    = -1.440 / n**2 + 0.710 / n + 0.668 + 0.0636 * n
    A      = (1 + Fdr) / (1 - Fdr)
    Rd     = alpha'/2 * (1 + exp(-4/3 * A * sqrt(3 * (1 - alpha'))))
                      * exp(-sqrt(3 * (1 - alpha')))
    mu_tr  = sqrt(3 * mu_a * (mu_a + mu_s'))
    ld     = 1 / mu_tr                                [mm]

The wavelengths sampled for RGB are 600 / 550 / 450 nm.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np

#: Representative wavelengths for the R, G and B channels, in nanometres.
RGB_WAVELENGTHS_NM = (600.0, 550.0, 450.0)

#: Refractive index of skin at visible wavelengths.
SKIN_REFRACTIVE_INDEX = 1.4

#: Published tissue-optics fits are in 1/cm; this module reports 1/mm.
_CM_INV_TO_MM_INV = 0.1

#: Mie/Rayleigh scattering fit for skin: a [1/cm] at 500 nm, and exponent b.
_SCATTER_A_CM_INV = 46.0
_SCATTER_B = 1.421

#: Whole-blood absorption [1/cm] at 600 / 550 / 450 nm, for 150 g/L
#: haemoglobin (2.33 mM). Derived from Prahl's molar extinction tabulation
#: via mu_a = 2.303 * epsilon * c.
_BLOOD_OXY_CM_INV = np.array([17.1, 235.0, 336.5])
_BLOOD_DEOXY_CM_INV = np.array([78.6, 230.4, 553.3])

#: Typical epidermal thickness on the face, in mm. The two-layer stack is
#: reduced to one effective layer by weighting each layer's absorption by the
#: fraction of the total thickness it occupies. That reduction is an
#: approximation — a true two-layer solution would solve the diffusion
#: equation per layer with matched boundary conditions — and it biases
#: diffusion lengths short relative to Jensen's measured ``skin1`` values.
EPIDERMIS_THICKNESS_MM = 0.1


@dataclass(frozen=True)
class SkinScatteringProfile:
    """Per-channel subsurface scattering parameters for a skin shader."""

    melanin_fraction: float
    haemoglobin_fraction: float
    oxygen_saturation: float
    thickness_mm: float
    absorption_mm_inv: list[float]
    reduced_scattering_mm_inv: list[float]
    single_scattering_albedo: list[float]
    diffuse_reflectance: list[float]
    diffusion_length_mm: list[float]
    scatter_radius_mm: list[float]
    surface_albedo_srgb: list[float]
    translucency: float
    model: str = "jensen-2001-dipole/jacques-tissue-optics"

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


def melanin_absorption(wavelength_nm: np.ndarray) -> np.ndarray:
    """Melanosome absorption coefficient in 1/cm (Jacques 1998).

    Returned in 1/cm because that is the unit the published fit is stated in;
    ~230 /cm at 694 nm. :func:`compute_skin_profile` converts to 1/mm.
    """
    return 6.6e11 * np.power(wavelength_nm, -3.33)


def baseline_absorption(wavelength_nm: np.ndarray) -> np.ndarray:
    """Bloodless, melanin-free tissue absorption in 1/cm."""
    return 0.244 + 85.3 * np.exp(-(wavelength_nm - 154.0) / 66.2)


def reduced_scattering(wavelength_nm: np.ndarray) -> np.ndarray:
    """Reduced scattering coefficient mu_s' in 1/mm (Jacques 2013)."""
    return (
        _SCATTER_A_CM_INV
        * np.power(wavelength_nm / 500.0, -_SCATTER_B)
        * _CM_INV_TO_MM_INV
    )


def diffuse_reflectance(
    absorption: np.ndarray,
    scattering: np.ndarray,
    refractive_index: float = SKIN_REFRACTIVE_INDEX,
) -> np.ndarray:
    """Total diffuse reflectance Rd from the Jensen dipole approximation."""
    extinction = absorption + scattering
    albedo = np.divide(
        scattering,
        extinction,
        out=np.zeros_like(scattering),
        where=extinction > 0,
    )
    n = refractive_index
    fdr = -1.440 / n**2 + 0.710 / n + 0.668 + 0.0636 * n
    boundary = (1.0 + fdr) / (1.0 - fdr)

    s = np.sqrt(3.0 * (1.0 - albedo))
    return (albedo / 2.0) * (1.0 + np.exp(-4.0 / 3.0 * boundary * s)) * np.exp(-s)


def compute_skin_profile(
    *,
    melanin_fraction: float = 0.12,
    haemoglobin_fraction: float = 0.008,
    oxygen_saturation: float = 0.85,
    thickness_mm: float = 1.4,
) -> SkinScatteringProfile:
    """Compute a full subsurface scattering profile for one skin type.

    Args:
        melanin_fraction: Melanosome volume fraction of the epidermis.
            Roughly 0.013-0.043 for lightly pigmented skin through 0.18-0.43
            for darkly pigmented skin.
        haemoglobin_fraction: Blood volume fraction of the dermis (~0.002-0.05).
        oxygen_saturation: Fraction of haemoglobin carrying oxygen.
        thickness_mm: Combined epidermis + dermis thickness.

    Raises:
        ValueError: if any fraction falls outside its physical range.
    """
    _check_unit_range("melanin_fraction", melanin_fraction)
    _check_unit_range("haemoglobin_fraction", haemoglobin_fraction)
    _check_unit_range("oxygen_saturation", oxygen_saturation)
    if thickness_mm <= 0:
        raise ValueError(f"thickness_mm must be positive, got {thickness_mm}")

    wavelengths = np.array(RGB_WAVELENGTHS_NM, dtype=np.float64)
    baseline = baseline_absorption(wavelengths)  # 1/cm

    epidermis = melanin_fraction * melanin_absorption(wavelengths) + (
        1.0 - melanin_fraction
    ) * baseline
    blood = (
        oxygen_saturation * _BLOOD_OXY_CM_INV
        + (1.0 - oxygen_saturation) * _BLOOD_DEOXY_CM_INV
    )
    dermis = haemoglobin_fraction * blood + (1.0 - haemoglobin_fraction) * baseline

    epidermis_fraction = min(EPIDERMIS_THICKNESS_MM / thickness_mm, 1.0)
    absorption = (
        epidermis_fraction * epidermis + (1.0 - epidermis_fraction) * dermis
    ) * _CM_INV_TO_MM_INV
    scattering = reduced_scattering(wavelengths)

    extinction = absorption + scattering
    albedo = scattering / extinction
    reflectance = diffuse_reflectance(absorption, scattering)

    transport = np.sqrt(3.0 * absorption * extinction)
    diffusion_length = 1.0 / transport

    # Renderers clamp the scatter kernel to the tissue it can actually reach.
    scatter_radius = np.minimum(diffusion_length, thickness_mm)

    return SkinScatteringProfile(
        melanin_fraction=round(melanin_fraction, 6),
        haemoglobin_fraction=round(haemoglobin_fraction, 6),
        oxygen_saturation=round(oxygen_saturation, 6),
        thickness_mm=round(thickness_mm, 4),
        absorption_mm_inv=_round_list(absorption, 6),
        reduced_scattering_mm_inv=_round_list(scattering, 6),
        single_scattering_albedo=_round_list(albedo, 6),
        diffuse_reflectance=_round_list(reflectance, 6),
        diffusion_length_mm=_round_list(diffusion_length, 6),
        scatter_radius_mm=_round_list(scatter_radius, 6),
        surface_albedo_srgb=_round_list(_linear_to_srgb(reflectance), 6),
        translucency=round(float(np.mean(scatter_radius) / thickness_mm), 6),
    )


def profile_for_skin_tone(hex_color: str) -> SkinScatteringProfile:
    """Derive a scattering profile from an sRGB skin-tone swatch.

    Luminance is inverted into a melanin fraction across the range the
    two-layer model is valid over, and the red-versus-green ratio drives blood
    volume, since perfusion is what makes skin read ruddy.
    """
    rgb = _parse_hex(hex_color)
    linear = _srgb_to_linear(rgb)
    luminance = float(0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2])

    melanin = float(np.clip(0.013 + (1.0 - luminance) ** 1.6 * 0.42, 0.013, 0.43))
    ruddiness = float(np.clip(linear[0] - linear[1], 0.0, 0.35)) / 0.35
    haemoglobin = float(np.clip(0.002 + ruddiness * 0.048, 0.002, 0.05))

    return compute_skin_profile(
        melanin_fraction=melanin,
        haemoglobin_fraction=haemoglobin,
    )


# ── Internals ────────────────────────────────────────────────────────────────


def _check_unit_range(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be within [0, 1], got {value}")


def _round_list(values: np.ndarray, places: int) -> list[float]:
    return [round(float(v), places) for v in values]


def _parse_hex(hex_color: str) -> np.ndarray:
    text = hex_color.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(c * 2 for c in text)
    if len(text) != 6:
        raise ValueError(f"Expected a #RRGGBB colour, got {hex_color!r}")
    try:
        channels = [int(text[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]
    except ValueError as exc:
        raise ValueError(f"Expected a #RRGGBB colour, got {hex_color!r}") from exc
    return np.array(channels, dtype=np.float64)


def _srgb_to_linear(values: np.ndarray) -> np.ndarray:
    return np.where(
        values <= 0.04045,
        values / 12.92,
        ((values + 0.055) / 1.055) ** 2.4,
    )


def _linear_to_srgb(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return np.where(
        clipped <= 0.0031308,
        clipped * 12.92,
        1.055 * np.power(clipped, 1 / 2.4) - 0.055,
    )
