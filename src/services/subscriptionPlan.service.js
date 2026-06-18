function isZeroFeePlan(plan) {
  return Number(plan?.price ?? 0) <= 0;
}

module.exports = {
  isZeroFeePlan,
};
