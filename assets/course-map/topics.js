const courseTopics = {
  "limit": {
    "title": "Limit",
    "summary":
      "A limit describes the values of a function near an input; the function’s value at that input may be different or undefined.",
    "example":
      "For (x² − 4)/(x − 2), the limit as x approaches 2 is 4, even though the original expression is undefined at 2.",
    "href": "../lectures/02-limits.html#limits-and-function-values",
  },
  "derivative": {
    "title": "Derivative at a point",
    "summary":
      "The derivative is the limit of a difference quotient, when that limit exists. It gives an instantaneous rate and the slope of a tangent line.",
    "example":
      "For f(x) = |x| at 0, the left and right slopes are different, so f′(0) does not exist.",
    "href":
      "../lectures/09-derivative-at-a-point.html#the-derivative-at-a-point",
  },
  "continuity": {
    "title": "Continuity",
    "summary":
      "A function is continuous at a point when its limit there exists and equals its value. Differentiability implies continuity; the converse need not hold.",
    "example":
      "The function |x| is continuous at 0, but it is not differentiable there.",
    "href": "../lectures/06-continuity.html#continuity-at-a-point",
  },
  "ivt": {
    "title": "Intermediate Value Theorem",
    "summary":
      "If f is continuous on [a, b], then every value between f(a) and f(b) is attained on that interval. The theorem guarantees existence, not uniqueness.",
    "example":
      "For f(x) = 4x³ − 6x² + 3x − 2, the values at 0 and 2 have opposite signs, so f has a zero between them.",
    "href":
      "../lectures/07-intermediate-value.html#the-intermediate-value-theorem",
  },
  "lhospital": {
    "title": "l’Hospital’s rule",
    "summary":
      "For a quotient in the form 0/0 or ∞/∞, under the theorem’s hypotheses a limit of derivatives can help determine the original limit.",
    "example":
      "As x → ∞, eˣ/x² → ∞. Repeated differentiation compares the growth of the exponential and polynomial.",
    "href": "../lectures/lhopitals-rule.html#infinity-over-infinity",
  },
  "derivative2": {
    "title": "Derivative",
    "summary":
      "The derivative gives an instantaneous rate of change. It also produces a new function f′, which can itself be differentiated.",
    "example":
      "For position s(t), velocity is s′(t) and acceleration is s″(t).",
    "href": "../lectures/10-derivative-function.html",
  },
  "tangent": {
    "title": "Tangent line",
    "summary":
      "At x = a, the derivative f′(a) is the tangent slope. Combine it with the point (a, f(a)).",
    "example":
      "For f(x) = 3/x² + 1 at x = 1, the point is (1, 4) and the slope is −6.",
    "href":
      "../lectures/11-differentiation-rules.html#tangent-lines-and-prescribed-slopes",
  },
  "motion": {
    "title": "Motion",
    "summary":
      "Position, velocity, and acceleration are connected by differentiation. Velocity gives direction; speed is the absolute value of velocity.",
    "example":
      "For s(t) = t³ − 6t² + 9t + 2, compare the signs of v(t) and a(t) to find when the particle speeds up or slows down.",
    "href": "../lectures/12-rates-of-change.html",
  },
  "rules": {
    "title": "Differentiation rules",
    "summary":
      "The power, product, quotient, and other rules let us calculate derivatives without returning to the limit definition each time.",
    "example":
      "For f(x) = x(3 − x), the product rule gives f′(x) = (3 − x) − x = 3 − 2x.",
    "href":
      "../lectures/11-differentiation-rules.html#section-3.3-the-rules-we-will-use",
  },
  "chain": {
    "title": "Chain rule",
    "summary":
      "To differentiate a composition, differentiate the outer function at the inner expression and multiply by the derivative of the inner function.",
    "example": "For y = cos⁴x, the derivative is −4 cos³x sin x.",
    "href": "../lectures/14-chain-rule.html#the-chain-rule",
  },
  "rates": {
    "title": "Related rates",
    "summary":
      "Relate quantities with an equation, differentiate with respect to time, and then substitute values at the specified instant.",
    "example": "If y = x², x = 3, and dx/dt = 2, then dy/dt = 2x dx/dt = 12.",
    "href": "../lectures/related-rates.html#the-three-steps",
  },
  "derivatives": {
    "title": "First and second derivatives",
    "summary":
      "The first derivative describes rate of change. The second derivative describes how the first derivative changes. Their signs help us analyze a graph.",
    "example": "For g(x) = x³ + 1, g′(x) = 3x² and g″(x) = 6x.",
    "href": "../lectures/section-4-3.html#concavity-and-inflection-points",
  },
  "monotonic": {
    "title": "Increasing and decreasing",
    "summary":
      "On an interval, f′ > 0 implies f is increasing; f′ < 0 implies f is decreasing. A sign change can help classify an interior critical number.",
    "example":
      "For f(x) = 4x³ − 12x + 12, f′ changes from positive to negative at x = −1 and from negative to positive at x = 1.",
    "href": "../lectures/section-4-3.html#the-first-derivative-test",
  },
  "concavity": {
    "title": "Concavity",
    "summary":
      "Where f″ > 0 on an interval the graph is concave up; where f″ < 0 it is concave down. An inflection point requires a change in concavity.",
    "example":
      "For g(x) = x³ + 1, g″(x) = 6x changes sign at 0, giving the inflection point (0, 1).",
    "href": "../lectures/section-4-3.html#concavity-and-inflection-points",
  },
  "critical": {
    "title": "Critical numbers",
    "summary":
      "A critical number c lies in the domain of f and satisfies f′(c) = 0 or f′(c) does not exist. It is a candidate for an extremum, not a guarantee.",
    "example":
      "For f(x) = x³, 0 is critical, but f has neither a local maximum nor a local minimum there.",
    "href": "../lectures/18-maxima-and-minima.html#finding-global-extrema",
  },
  "sketch": {
    "title": "Curve sketching",
    "summary":
      "Combine domain, intercepts, asymptotes, increasing and decreasing intervals, extrema, and concavity to understand the shape of a graph.",
    "example":
      "In the notes, f(x) = x/(x + 1) is analyzed using its domain, asymptotes, and derivatives.",
    "href": "../lectures/curve-sketching.html#curve-sketching-steps",
  },
  "optimization": {
    "title": "Optimization",
    "summary":
      "Identify the objective and constraints, reduce to an allowed domain, and justify the global maximum or minimum. Check endpoints when appropriate.",
    "example":
      "For x, y ≥ 0 with x + y = 6, the maximum of xy is 9, attained at (3, 3).",
    "href": "../lectures/optimization.html#primer",
  },
  "endbehavior": {
    "title": "End behavior and asymptotes",
    "summary":
      "Limits as x → ±∞ describe behavior far to the left or right. A slant asymptote y = mx + b requires f(x) − (mx + b) → 0 at the relevant end.",
    "example":
      "For f(x) = (x² − 1)/x = x − 1/x, the line y = x is a slant asymptote at both ends.",
    "href":
      "../lectures/19-end-behaviour-and-curve-sketching.html#slant-asymptotes",
  },
  "sides": {
    "title": "One-sided limits",
    "summary":
      "A finite two-sided limit exists precisely when the left and right limits exist and agree.",
    "example":
      "For (x² − 4)/|x − 2|, the limits at 2 are −4 from the left and 4 from the right.",
    "href": "../lectures/02-limits.html",
  },
  "laws": {
    "title": "Limit laws",
    "summary":
      "Sums and products preserve finite limits. For a quotient, the denominator must have a nonzero limit.",
    "example": "As x approaches 2, the limit of 3x² − 2x + 1 is 9.",
    "href": "../lectures/04-limit-laws.html#the-limit-laws",
  },
  "squeeze": {
    "title": "Squeeze theorem",
    "summary":
      "If two bounds approach the same value, a function between them approaches that value too.",
    "example": "Since −x² ≤ x² sin(1/x) ≤ x² for x ≠ 0, the limit at 0 is 0.",
    "href": "../lectures/05-squeeze-theorem.html#the-squeeze-theorem",
  },
  "evt": {
    "title": "Extreme Value Theorem",
    "summary":
      "A continuous function on a closed, bounded interval attains both its largest and its smallest value.",
    "example":
      "The polynomial x³(4 − x) attains both global extrema on [−1, 4]. The closed-interval method locates them.",
    "href": "../lectures/18-maxima-and-minima.html#extreme-value-theorem",
  },
  "global": {
    "title": "Global extrema",
    "summary":
      "A global extremum compares one output with every output on the domain. On a closed interval, compare the endpoints and all interior critical numbers of a continuous function.",
    "example":
      "For f(x) = x + 2 on [−1, 1], both extrema occur at endpoints. The minimum is 1 and the maximum is 3.",
    "href": "../lectures/18-maxima-and-minima.html#closed-interval-method",
  },
  "local": {
    "title": "Local extrema",
    "summary":
      "A local extremum compares outputs near a point. At an interior critical number where f is continuous, a change in f′ from positive to negative gives a local maximum. The opposite change gives a local minimum.",
    "example":
      "For f(x) = 4x³ − 12x + 12, f′ changes sign at −1 and 1. The local maximum is 20 and the local minimum is 4.",
    "href": "../lectures/section-4-3.html#first-derivative-test",
  },
  "inflect": {
    "title": "Inflection points",
    "summary":
      "At an inflection point, the graph changes concavity and the function is continuous.",
    "example":
      "For g(x) = x³ + 1, g″(x) = 6x changes from negative to positive at zero. The inflection point is (0, 1).",
    "href": "../lectures/section-4-3.html#inflection-point",
  },
  "implicit": {
    "title": "Implicit differentiation",
    "summary":
      "Differentiate the equation with y treated as a function of x. The chain rule supplies a factor of dy/dx whenever you differentiate a function of y.",
    "example":
      "For x² + y² = 1, differentiation gives 2x + 2y(dy/dx) = 0. The slope at (1/√2, 1/√2) is −1.",
    "href": "../lectures/16-implicit-differentiation.html",
  },
  "inverse": {
    "title": "Inverse functions",
    "summary":
      "At corresponding points, the slopes of a differentiable function and its differentiable inverse are reciprocals when the original slope is nonzero.",
    "example":
      "If f(2) = 5 and f′(2) = −3, the inverse has slope −1/3 at 5 under the inverse-derivative theorem’s hypotheses.",
    "href":
      "../lectures/15-inverse-functions.html#the-inverse-function-derivative",
  },
  "exp": {
    "title": "Exponentials and logarithms",
    "summary":
      "The derivative of eˣ is eˣ. Its inverse, the natural logarithm, has derivative 1/x on x > 0.",
    "example":
      "Differentiating 2 raised to 3x gives 3 ln(2) times 2 raised to 3x.",
    "href":
      "../lectures/17-exponential-logarithmic.html#the-natural-exponential-and-logarithm",
  },
  "logdiff": {
    "title": "Logarithmic differentiation",
    "summary":
      "Taking logarithms turns a variable power into a product. Differentiate the logarithmic identity and solve for the derivative.",
    "example": "For y = xˣ with x > 0, ln y = x ln x. Hence y′ = xˣ(ln x + 1).",
    "href":
      "../lectures/17-exponential-logarithmic.html#logarithmic-differentiation",
  },
  "trig": {
    "title": "Trigonometric derivatives",
    "summary":
      "With angles in radians, the derivative of sine is cosine and the derivative of cosine is negative sine.",
    "example": "For G(x) = 3 sin x − x², G′(x) = 3 cos x − 2x.",
    "href": "../lectures/13-trigonometric-derivatives.html",
  },
};
