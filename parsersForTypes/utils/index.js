const _ = require("lodash");
const {
  makeOptions,
  makeAlternativesFromOptions,
  maybeOptionsFromWhens
} = require("./alternatives");
const { merge, mergeDiff } = require("./merge");
const { retrieveReference, retrievePrintedReference } = require("./reference");
const { isJoi } = require("./joi");
const {
  removeKeyWithPath,
  removeDuplicates,
  requiredFieldsFromList,
  isFieldPresent,
  removeSubsets
} = require("./object");
const { extract: extractNands, buildAlternatives: buildNandAlternatives } = require("./nand");
const { extract: extractXors, buildAlternatives: buildXorAlternatives } = require("./xor");

const getBodyObjKey = condition => {
  if ("oneOf" in condition) return { oneOf: condition.oneOf };
  if ("anyOf" in condition) return { anyOf: condition.anyOf };
  if ("allOf" in condition) return { allOf: condition.allOf };

  if (condition.type === "object") {
    const { isRequired, ...rest } = condition;
    return rest;
  }

  return {
    type: condition.type
  };
};

const convertIs = (joiObj, valids, state, convert) => {
  if (joiObj) {
    if (joiObj.type === "any" && joiObj._flags.presence !== "forbidden") {
      const validValues = valids ? valids._values : new Set();
      let converted = { type: "any" };
      if (validValues && validValues.size === 1) {
        const values = Array.from(validValues);
        if (typeof values[0] === "string") converted = { type: "string", enum: values };
      }
      return converted;
    }

    return convert(joiObj, state);
  }

  return undefined;
};

const values = (joiSchema, state, convert) => {
  if (joiSchema._valids && joiSchema._valids._values.size) {
    const validValues = Array.from(joiSchema._valids._values);
    return validValues.reduce((acc, value) => {
      if (value !== null) {
        const [type, val] = isJoi(value)
          ? [value.type, convert(value, state)]
          : [typeof value, value];
        return { ...acc, [type]: [...(acc[type] ?? []), val] };
      }
      return acc;
    }, {});
  }
  return {};
};

const isEnumerableType = type => type === "number" || type === "string" || type === "boolean";

const partitionEmptyValue = vals => _.partition(vals, v => v !== "");

const mergeEmptyValue = (openApiObj, empty) => {
  const [emptyValue] = empty;
  const _openApiObj = openApiObj;
  if (typeof emptyValue === "undefined") return _openApiObj;

  switch (_openApiObj.type) {
    case "string": {
      const isEnum = (_openApiObj.enum ?? []).length > 0;
      if (_openApiObj.format) {
        return { anyOf: [_openApiObj, { type: "string", enum: [emptyValue] }] };
      }
      if (isEnum && typeof _openApiObj.minLength === "undefined") {
        const newEnum = _openApiObj.enum.filter(val => val === emptyValue);
        _openApiObj.enum = [...newEnum, emptyValue];
        return _openApiObj;
      }
      const minLength = _openApiObj.minLength ?? 0;
      if (minLength <= 1 && !isEnum) {
        delete _openApiObj.minLength;
        return _openApiObj;
      }
      return { anyOf: [_openApiObj, { type: "string", enum: [emptyValue] }] };
    }
    default:
      return _openApiObj;
  }
};

const buildNumberAlternatives = obj => {
  const { minimum, maximum, enum: vals, ...rest } = obj;

  if (!vals || (!minimum && !maximum)) return obj;

  const valuesNotInInternal = vals.filter(num => num > maximum || num < minimum);
  const oneOf = {
    ...rest,
    minimum,
    maximum
  };

  if (valuesNotInInternal.length > 0) {
    return {
      oneOf: [
        oneOf,
        {
          ...rest,
          enum: valuesNotInInternal
        }
      ]
    };
  }
  return oneOf;
};

const addAllows = (joiSchema, openApiObj, state, convert) => {
  let _openApiObj = openApiObj;
  const { type } = joiSchema;
  if (joiSchema._valids) {
    joiSchema._valids._values.delete(null);

    const vals = Object.entries(values(joiSchema, state, convert));
    if (vals.length === 0) return _openApiObj;

    const [sameType, differentTypes] = _.partition(vals, v => v[0] === type);
    if (sameType.length > 0) {
      if (isEnumerableType(type)) {
        const [alternativesValues, empty] = partitionEmptyValue(sameType[0][1]);
        let unumeration;
        if (alternativesValues.length > 0) unumeration = { enum: alternativesValues };

        const objWithEmpty = mergeEmptyValue({ ..._openApiObj, ...unumeration }, empty);
        switch (type) {
          case "number":
            _openApiObj = buildNumberAlternatives(objWithEmpty);
            break;
          default:
            _openApiObj = objWithEmpty;
        }
      } else {
        _openApiObj = merge(_openApiObj, { anyOf: [sameType[0][1][0]] });
      }
    }

    return differentTypes.reduce((acc, [itemType, item]) => {
      switch (itemType) {
        case "string":
          return merge(acc, { anyOf: [{ type: "string", enum: item }] });
        case "boolean":
          return merge(acc, { anyOf: [{ type: "boolean", enum: item }] });
        case "number":
          return merge(acc, { anyOf: [{ type: "number", enum: item }] });
        default:
          return merge(acc, { anyOf: item });
      }
    }, _openApiObj);
  }

  return _openApiObj;
};

const options = (schema, state, convert, fn) => {
  const _schema = {
    optOf: [
      ...schema.$_terms.whens.map(s => {
        const is = convertIs(s.is, s.is._valids, state, convert);
        const ref = s.ref ? s.ref.key : undefined;
        return {
          is,
          otherwise: fn(s.otherwise, schema, convert, state),
          then: fn(s.then, schema, convert, state),
          ref
        };
      })
    ]
  };
  return _schema;
};

module.exports = {
  retrieveReference,
  retrievePrintedReference,
  getBodyObjKey,
  values,
  options,
  isJoi,
  makeOptions,
  makeAlternativesFromOptions,
  maybeOptionsFromWhens,
  merge,
  mergeDiff,
  removeKeyWithPath,
  extractNands,
  extractXors,
  removeDuplicates,
  requiredFieldsFromList,
  isFieldPresent,
  removeSubsets,
  buildNandAlternatives,
  buildXorAlternatives,
  addAllows
};
