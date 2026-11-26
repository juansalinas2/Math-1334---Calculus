// Coordinates keep each concept in the same place across visits.
// The short labels belong to the diagram; topics.js holds the lecture text.
const families = {
  limits: { label: "Limits & continuity", color: "#127c73" },
  differentiation: { label: "Differentiation", color: "#4054ae" },
  shape: { label: "Shape & extrema", color: "#965387" },
  applications: { label: "Applications", color: "#b35729" },
};

const stations = [
  // Topic, family, position, map label, and optional mathematical symbol for a hub.
  ["sides", "limits", 94, 236, "One-sided limits"],
  ["laws", "limits", 85, 92, "Limit laws"],
  ["squeeze", "limits", 283, 85, "Squeeze theorem"],
  ["limit", "limits", 285, 236, "Limits", "lim"],
  ["continuity", "limits", 508, 100, "Continuity", "C"],
  ["ivt", "limits", 709, 55, "Intermediate value"],
  ["evt", "limits", 860, 118, "Extreme value"],
  ["global", "shape", 1080, 117, "Global extrema"],
  ["optimization", "applications", 1280, 65, "Optimization", "opt"],
  ["derivative", "differentiation", 530, 281, "Derivative", "f′"],
  ["monotonic", "shape", 776, 245, "Increasing / decreasing"],
  ["critical", "shape", 995, 225, "Critical numbers"],
  ["local", "shape", 1180, 275, "Local extrema"],
  ["tangent", "differentiation", 510, 408, "Tangent line"],
  ["motion", "applications", 723, 409, "Motion"],
  ["derivatives", "shape", 790, 540, "Second derivative", "f″"],
  ["concavity", "shape", 970, 469, "Concavity"],
  ["inflect", "shape", 1127, 540, "Inflection points"],
  ["sketch", "applications", 1320, 415, "Curve sketching", "ƒ"],
  ["endbehavior", "limits", 1305, 627, "End behavior"],
  ["lhospital", "applications", 209, 377, "l’Hospital’s rule"],
  ["rules", "differentiation", 300, 492, "Derivative rules"],
  ["trig", "differentiation", 82, 477, "Trig derivatives"],
  ["chain", "differentiation", 332, 630, "Chain rule", "∘"],
  ["inverse", "differentiation", 110, 644, "Inverse functions"],
  ["exp", "differentiation", 114, 767, "Exponentials / logs"],
  ["logdiff", "differentiation", 399, 767, "Log differentiation"],
  ["implicit", "differentiation", 565, 628, "Implicit differentiation"],
  ["rates", "applications", 777, 717, "Related rates"],
].map(([id, family, x, y, label, symbol]) => ({
  id,
  family,
  x,
  y,
  label,
  symbol,
  ...courseTopics[id],
}));

// Every connection states the mathematical relationship when either end is selected.
// Longer connections appear on selection to keep the overview legible.
const connections = [
  [
    "sides",
    "limit",
    "The two one-sided limits must agree for a finite two-sided limit to exist.",
  ],
  ["laws", "limit", "Limit laws combine limits whose values are known."],
  [
    "squeeze",
    "limit",
    "Two bounds with the same limit determine the limit between them.",
  ],
  [
    "limit",
    "continuity",
    "Continuity at a point requires the limit to equal the function value.",
  ],
  [
    "continuity",
    "ivt",
    "Continuity on [a, b] ensures that every intermediate value between the endpoint values is attained.",
  ],
  [
    "continuity",
    "evt",
    "Continuity on [a, b] ensures that both global extrema are attained.",
  ],
  [
    "evt",
    "global",
    "The Extreme Value Theorem guarantees that the largest and smallest outputs exist.",
  ],
  [
    "critical",
    "global",
    "Compare values at interior critical numbers and endpoints on a closed interval.",
  ],
  [
    "global",
    "optimization",
    "The best feasible objective value is a global extremum.",
  ],
  [
    "limit",
    "derivative",
    "The limit of the difference quotient gives the derivative at a point.",
  ],
  [
    "derivative",
    "continuity",
    "Differentiability at a point implies continuity there.",
  ],
  [
    "derivative",
    "lhospital",
    "For a qualifying indeterminate form, compare the derivatives of the numerator and denominator.",
  ],
  ["limit", "lhospital", "Check for 0/0 or ∞/∞ before applying the rule."],
  [
    "derivative",
    "tangent",
    "The derivative at a point is the slope of its tangent line.",
  ],
  [
    "derivative",
    "motion",
    "The derivative of position gives instantaneous velocity.",
  ],
  [
    "derivative",
    "monotonic",
    "By the Mean Value Theorem, a strictly positive derivative on an interval implies increase there.",
  ],
  [
    "derivative",
    "critical",
    "Look in the domain for inputs where the derivative is zero or does not exist.",
    true,
  ],
  [
    "monotonic",
    "local",
    "A change from increasing to decreasing gives a local maximum.",
    true,
  ],
  [
    "critical",
    "local",
    "The first derivative test checks how the derivative changes sign across a critical number.",
  ],
  [
    "local",
    "sketch",
    "Local maxima and minima locate the peaks and valleys of a sketch.",
  ],
  [
    "monotonic",
    "sketch",
    "The sign of the first derivative tells which way to draw the graph on each interval.",
    true,
  ],
  [
    "derivative",
    "derivatives",
    "Differentiating the derivative function gives the second derivative.",
    true,
  ],
  [
    "derivatives",
    "motion",
    "The second derivative of position gives acceleration.",
  ],
  [
    "derivatives",
    "concavity",
    "The sign of the second derivative gives the direction of concavity on an interval.",
  ],
  [
    "concavity",
    "inflect",
    "A change in concavity at a point of continuity gives an inflection point.",
  ],
  [
    "concavity",
    "sketch",
    "Concavity determines how each portion of the sketch bends.",
  ],
  [
    "inflect",
    "sketch",
    "Inflection points mark changes in bending on the graph.",
  ],
  [
    "limit",
    "endbehavior",
    "Limits at infinity describe how a graph behaves far to the left or right.",
    true,
  ],
  [
    "endbehavior",
    "sketch",
    "Horizontal and slant asymptotes describe the tails of a sketch.",
  ],
  [
    "derivative",
    "rules",
    "Differentiation rules calculate the derivative directly from the expression.",
  ],
  [
    "rules",
    "trig",
    "Trig derivative formulas combine with the product and quotient rules.",
  ],
  ["rules", "chain", "A composition calls for the chain rule."],
  [
    "chain",
    "implicit",
    "Treat y as a function of x when differentiating the equation.",
  ],
  [
    "implicit",
    "rates",
    "Differentiate the relation with respect to time to connect the unknown and known rates.",
  ],
  [
    "chain",
    "inverse",
    "Differentiate the inverse identity to obtain reciprocal slopes at corresponding points.",
  ],
  [
    "inverse",
    "exp",
    "The exponential and natural logarithm are inverses, which relates their derivatives.",
  ],
  [
    "exp",
    "logdiff",
    "Logarithm laws turn variable powers into products before differentiation.",
  ],
  [
    "implicit",
    "logdiff",
    "Implicitly differentiating ln y introduces the factor y′/y.",
  ],
  ["chain", "rates", "For y = f(x(t)), dy/dt = f′(x) dx/dt.", true],
  [
    "squeeze",
    "trig",
    "The fundamental trigonometric limit enters the derivative of sine.",
    true,
  ],
  [
    "derivatives",
    "local",
    "At a stationary point, the second derivative test can classify a local extremum.",
    true,
  ],
].map(([source, target, explanation, onSelection = false]) => ({
  source,
  target,
  explanation,
  onSelection,
}));
