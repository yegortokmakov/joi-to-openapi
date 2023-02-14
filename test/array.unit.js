const chai = require("chai");

const { expect } = chai;
const Joi = require("joi");
const chaiAsPromised = require("chai-as-promised");
const sinonChai = require("sinon-chai");
const { convert } = require("../index");

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe("Joi Array to OpenAPI", () => {
  describe("When an array is given", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(Joi.string().valid("a", "b"));
      expectedObj = {
        type: "array",
        items: {
          type: "string",
          enum: ["a", "b"]
        }
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with allow of different type", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(Joi.string().valid("a", "b")).allow(1);
      expectedObj = {
        anyOf: [
          {
            type: "array",
            items: {
              type: "string",
              enum: ["a", "b"]
            }
          },
          {
            type: "number",
            enum: [1]
          }
        ]
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with allow with same type", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array()
        .items(Joi.string().valid("a", "b"))
        .allow(Joi.array().items(Joi.string().valid(1, 2)));
      expectedObj = {
        anyOf: [
          {
            type: "array",
            items: {
              type: "string",
              enum: ["a", "b"]
            }
          },
          {
            type: "array",
            items: {
              anyOf: [
                {
                  type: "string"
                },
                { type: "number", enum: [1, 2] }
              ]
            }
          }
        ]
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with multiple items", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(
        Joi.string().valid("a", "b"),
        Joi.object().keys({ a: Joi.string().required() })
      );
      expectedObj = {
        type: "array",
        items: {
          anyOf: [
            {
              type: "string",
              enum: ["a", "b"]
            },
            {
              type: "object",
              additionalProperties: false,
              properties: {
                a: {
                  type: "string"
                }
              },
              required: ["a"]
            }
          ]
        }
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with length", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(Joi.string().valid("a", "b")).length(10);
      expectedObj = {
        type: "array",
        items: {
          type: "string",
          enum: ["a", "b"]
        },
        maxItems: 10,
        minItems: 10
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with min", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(Joi.string().valid("a", "b")).min(10);
      expectedObj = {
        type: "array",
        items: {
          type: "string",
          enum: ["a", "b"]
        },
        minItems: 10
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });

  describe("When an array is given with min", () => {
    let obj;
    let expectedObj;

    beforeEach(() => {
      obj = Joi.array().items(Joi.string().valid("a", "b")).max(10);
      expectedObj = {
        type: "array",
        items: {
          type: "string",
          enum: ["a", "b"]
        },
        maxItems: 10
      };
    });

    it("should be converted in the proper open-api", () =>
      expect(convert(obj)).deep.equal(expectedObj));
  });
});
