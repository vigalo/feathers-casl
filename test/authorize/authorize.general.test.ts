import assert from "assert";
import authorize from "../../lib/hooks/authorize/authorize.hook";
import {
  createAliasResolver,
  defineAbility
} from "@casl/ability";

const resolveAction = createAliasResolver({
  update: "patch",
  read: ["get", "find"],
  delete: "remove"
});

describe("authorize-hook", function() {
  it("passes if no ability", async function() {
    const makeContext = (method: string, type: string) => {
      return {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method,
        type,
        data: {
          id: 1,
          userId: 1,
          test: true
        },
        params: {
          query: {},
        }
      };
    };

    const types = ["before"];
    const methods = ["find", "get", "create", "update", "patch", "remove"];
    const promises = [];
    types.forEach(type => {
      methods.forEach(method => {
        const context = makeContext(method, type);
        const query = Object.assign({}, context.params.query);
        //@ts-ignore
        const promise = authorize()(context).then(result => {
          assert.deepStrictEqual(result.params.query, query, `'${type}:${method}': does not change query object`);
        });
        promises.push(promise);
      });
    });
    await Promise.all(promises);
  });

  it("passes if skip", async function() {
    const makeContext = (method, type) => {
      return {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method,
        type,
        data: {
          id: 1,
          userId: 1,
          test: true
        },
        params: {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          ability: defineAbility({ resolveAction }, () => {}),
          skipHooks: ["authorize"],
          query: {},
        }
      };
    };

    const types = ["before"];
    const methods = ["find", "get", "create", "update", "patch", "remove"];
    const promises = [];
    types.forEach(type => {
      methods.forEach(method => {
        const context = makeContext(method, type);
        const query = Object.assign({}, context.params.query);
        //@ts-ignore
        const promise = authorize()(context).then(result => {
          assert.deepStrictEqual(result.params.query, query, `'${type}:${method}': does not change query object`);
        });
        promises.push(promise);
      });
    });
    await Promise.all(promises);
  });

  it("throws forbidden for no permissions", async function() {
    const makeContext = (method = "find", type = "before") => {
      return {
        service: {
          modelName: "Test",
          get(id) {
            return { id, userId: 1 };
          }
        },
        path: "tests",
        method,
        type,
        id: 1,
        data: {
          id: 1,
          userId: 1,
          test: true
        },
        params: {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          ability: defineAbility({ resolveAction }, () => {}),
          query: {}
        }
      };
    };

    const types = ["before"];
    const methods = ["find", "get", "create", "update", "patch", "remove"];
    const promises = [];
    types.forEach(type => {
      methods.forEach(method => {
        const context = makeContext(method, type);
        const promise = assert.rejects(
          //@ts-ignore
          authorize()(context),
          (err) => err.name === "Forbidden",
          `'${type}:${method}': with no permissions returns 'Forbidden' error`
        );
        promises.push(promise);
      });
    });
    await Promise.all(promises);
  });

  it("passes for 'manage' 'all' permission", async function() {
    const makeContext = (method, type) => {
      return {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method,
        type,
        data: {
          id: 1,
          userId: 1,
          test: true
        },
        params: {
          ability: defineAbility({ resolveAction }, (can) => {
            can("manage", "all");
          }),
          query: {},
        }
      };
    };

    const types = ["before"];
    const methods = ["find", "get", "create", "update", "patch", "remove"];
    const promises = [];
    types.forEach(type => {
      methods.forEach(method => {
        const context = makeContext(method, type);
        const query = Object.assign({}, context.params.query);
        //@ts-ignore
        const promise = authorize()(context).then(result => {
          assert.deepStrictEqual(result.params.query, query, "does not change query object");
        });
        promises.push(promise);
      });
    });
    await Promise.all(promises);
  });

  describe("conditional", function() {
    it("passes for create single", async function() {
      const context = {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method: "create",
        type: "before",
        data: {
          id: 1,
          userId: 1,
          test: true
        },
        params: {
          ability: defineAbility({ resolveAction }, (can) => {
            can("create", "tests", { userId: 1 });
          }),
          query: {}
        }
      };
      //@ts-ignore
      await assert.doesNotReject(authorize()(context), "passes authorize hook");
    });

    it("passes for create multi", async function() {
      const context = {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method: "create",
        type: "before",
        data: [
          {
            id: 1,
            userId: 1,
            test: true
          }, {
            id: 2,
            userId: 1,
            test: true
          }, {
            id: 3,
            userId: 1,
            test: true
          }
        ],
        params: {
          ability: defineAbility({ resolveAction }, (can) => {
            can("create", "tests", { userId: 1 });
          }),
          query: {}
        }
      };

      //@ts-ignore
      await assert.doesNotReject(authorize()(context), "passes authorize hook");
    });

    it("fails for create single", async function() {
      const context = {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method: "create",
        type: "before",
        data: {
          id: 1,
          userId: 2,
          test: true
        },
        params: {
          ability: defineAbility({ resolveAction }, (can) => {
            can("create", "tests", { userId: 1 });
          }),
          query: {}
        }
      };

      await assert.rejects(
        //@ts-ignore
        authorize()(context),
        err => err.name === "Forbidden",
        "rejects with 'Forbidden' error"
      );
    });

    it("fails for create multi", async function() {
      const context = {
        service: {
          modelName: "Test",
        },
        path: "tests",
        method: "create",
        type: "before",
        data: [
          {
            id: 1,
            userId: 1,
            test: true
          }, {
            id: 1,
            userId: 2,
            test: true
          }, {
            id: 1,
            userId: 1,
            test: true
          }
        ],
        params: {
          ability: defineAbility({ resolveAction }, (can) => {
            can("create", "tests", { userId: 1 });
          }),
          query: {}
        }
      };

      await assert.rejects(
        //@ts-ignore
        authorize()(context),
        err => err.name === "Forbidden",
        "rejects with 'Forbidden' error"
      );
    });

    /*it("sets query for own things", async function() {
      const makeContext = (method, type) => {
        return {
          service: {
            modelName: "tests",
          },
          path: "tests",
          method,
          type,
          data: {
            id: 1,
            userId: 1,
            test: true
          },
          params: {
            ability: defineAbility({ resolveAction }, (can) => {
              can("read", "tests", { userId: 1 });
              can("update", "tests", { userId: 1 });
              can("remove", "tests", { userId: 1 });
            }),
            query: {},
          }
        };
      };

      const types = ["before"];
      const methods = ["find", "get", "update", "patch", "remove"];
      const promises = [];
      types.forEach(type => {
        methods.forEach(method => {
          const context = makeContext(method, type);
          const query = Object.assign({}, context.params.query);
          assert.deepStrictEqual(query, {}, "query is empty");
          const promise = authorize()(context).then(result => {
            assert.deepStrictEqual(result.params.query, { userId: 1 }, "queries for user");
          });
          promises.push(promise);
        });
      });
      await Promise.all(promises);
    });*/

    /*it("make right query for inverted rules", async function() {
      const pairs = [
        {
          condition: { userId: 1 },
          inverted: { userId: { $ne: 1 } }
        }, {
          condition: { userId: { $ne: 1 } },
          inverted: { userId: 1 }
        }, {
          condition: { userId: { $gt: 1 } },
          inverted: { userId: { $lte: 1 } }
        }, {
          condition: { userId: { $gte: 1 } },
          inverted: { userId: { $lt: 1 } }
        }, {
          condition: { userId: { $lt: 1 } },
          inverted: { userId: { $gte: 1 } }
        }, {
          condition: { userId: { $lte: 1 } },
          inverted: { userId: { $gt: 1 } }
        }, {
          condition: { userId: { $in: [1] } },
          inverted: { userId: { $nin: [1] } }
        }, {
          condition: { userId: { $nin: [1] } },
          inverted: { userId: { $in: [1] } }
        }
      ];
      const promises = [];

      pairs.forEach(({ condition, inverted }) => {
        const makeContext = (method, type) => {
          return {
            service: {
              modelName: "Test",
            },
            path: "tests",
            method,
            type,
            data: {
              id: 1,
              userId: 1,
              test: true
            },
            params: {
              ability: defineAbility({ resolveAction }, (can, cannot) => {
                can("manage", "all");
                cannot("read", "tests", condition);
                cannot("update", "tests", condition);
                cannot("remove", "tests", condition);
              }),
              query: {},
            }
          };
        };

        const types = ["before"];
        const methods = ["find", "get", "update", "patch", "remove"];

        types.forEach(type => {
          methods.forEach(method => {
            const context = makeContext(method, type);
            const query = Object.assign({}, context.params.query);
            assert.deepStrictEqual(query, {}, `'${type}:${method}': query is empty`);
            const promise = authorize()(context).then(result => {
              assert.deepStrictEqual(result.params.query, inverted, `'${type}:${method}': for condition: '${JSON.stringify(condition)}' the inverted is: ${JSON.stringify(result.params.query)}`);
            });
            promises.push(promise);
          });
        });
      });
      await Promise.all(promises);
    });*/
  });

  /*describe("fields", function() {
    it("simple select", async function() {
      const makeContext = (method = "find", type = "before") => {
        return {
          service: {
            modelName: "Test"
          },
          path: "tests",
          method,
          type,
          data: {
            id: 1,
            userId: 1,
            test: true
          },
          params: {
            ability: defineAbility({ resolveAction }, (can) => {
              can("read", "tests", ["id"]);
              can("update", "tests", ["id"]);
              can("remove", "tests", ["id"]);
            }),
            query: {}
          }
        };
      };

      const types = ["before"];
      const methods = ["find", "get", "update", "patch", "remove"];
      const promises = [];
      types.forEach(type => {
        methods.forEach(async method => {
          const context = makeContext(method, type);
          const promise = authorize()(context).then(result => {
            assert.deepStrictEqual(result.params.query, { $select: ["id"] }, "query has '$select'");
          });
          promises.push(promise);
        });
      });
      await Promise.all(promises);
    });

  });*/

  /*describe("conditions and fields", function() {
    it("simple condition and select", async function() {
      const makeContext = (method = "find", type = "before") => {
        return {
          service: {
            modelName: "Test"
          },
          path: "tests",
          method,
          type,
          data: {
            id: 1,
            userId: 1,
            test: true
          },
          params: {
            ability: defineAbility({ resolveAction }, (can) => {
              can("read", "tests", ["id"], { userId: 1 });
              can("update", "tests", ["id"], { userId: 1 });
              can("remove", "tests", ["id"], { userId: 1 });
            }),
            query: {}
          }
        };
      };

      const types = ["before"];
      const methods = ["find", "get", "update", "patch", "remove"];
      const promises = [];
      types.forEach(type => {
        methods.forEach(async method => {
          const context = makeContext(method, type);
          const promise = authorize()(context).then(result => {
            assert.deepStrictEqual(result.params.query, { $select: ["id"], userId: 1 }, `'${type}:${method}' query has '$select'`);
          });
          promises.push(promise);
        });
      });
      await Promise.all(promises);
    });
  });*/
});
