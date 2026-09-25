export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    req.valid = req.valid || {};
    req.valid[source] = schema.parse(req[source]);
    next();
  } catch (err) {
    next(err);
  }
};
