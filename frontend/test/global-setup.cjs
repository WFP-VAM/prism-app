module.exports = async () => {
  process.env.TZ = 'UTC';
  process.env.REACT_APP_GIT_HASH = 'sample_hash';
};
