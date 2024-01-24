import { useResolveStore } from '@/_stores/resolverStore';
import moment from 'moment';
import _, { isEmpty } from 'lodash';
import { useCurrentStateStore } from '@/_stores/currentStateStore';
import { any } from 'superstruct';
import { generateSchemaFromValidationDefinition, validate } from '../component-properties-validation';
import { hasCircularDependency } from '@/_helpers/utils';

const acorn = require('acorn');

const acorn_code = `
const array = [1, 2, 3];
const string = "hello";
const object = {};
const boolean = true;
const number = 1;
`;

const ast = acorn.parse(acorn_code, { ecmaVersion: 2020 });

export const getCurrentNodeType = (node) => Object.prototype.toString.call(node).slice(8, -1);

function traverseAST(node, callback) {
  callback(node);
  for (let key in node) {
    if (node[key] && typeof node[key] === 'object') {
      traverseAST(node[key], callback);
    }
  }
}

function getMethods(type) {
  const arrayMethods = Object.getOwnPropertyNames(Array.prototype).filter(
    (p) => typeof Array.prototype[p] === 'function'
  );
  const stringMethods = Object.getOwnPropertyNames(String.prototype).filter(
    (p) => typeof String.prototype[p] === 'function'
  );
  const objectMethods = Object.getOwnPropertyNames(Object.prototype).filter(
    (p) => typeof Object.prototype[p] === 'function'
  );
  const booleanMethods = Object.getOwnPropertyNames(Boolean.prototype).filter(
    (p) => typeof Boolean.prototype[p] === 'function'
  );
  const numberMethods = Object.getOwnPropertyNames(Number.prototype).filter(
    (p) => typeof Number.prototype[p] === 'function'
  );

  switch (type) {
    case 'Array':
      return arrayMethods;
    case 'String':
      return stringMethods;
    case 'Object':
      return objectMethods;
    case 'Boolean':
      return booleanMethods;
    case 'Number':
      return numberMethods;
    default:
      return [];
  }
}

function inferType(node) {
  if (node.type === 'ArrayExpression') {
    return 'Array';
  } else if (node.type === 'Literal') {
    if (typeof node.value === 'string') {
      return 'String';
    } else if (typeof node.value === 'number') {
      return 'Number';
    } else if (typeof node.value === 'boolean') {
      return 'Boolean';
    }
  } else if (node.type === 'ObjectExpression') {
    return 'Object';
  }
  return null;
}

export const createJavaScriptSuggestions = () => {
  const allMethods = {};

  traverseAST(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const type = inferType(node.init);
      if (type) {
        allMethods[node.id.name] = {
          type: type,
          methods: getMethods(type),
        };
      }
    }
  });

  return allMethods;
};

const resolveWorkspaceVariables = (query, state) => {
  let resolvedStr = query;
  let error = null;
  let valid = false;
  // Resolve %%object%%
  const serverRegex = /(%%.+?%%)/g;
  const serverMatch = resolvedStr.match(serverRegex)?.[0];

  if (serverMatch) {
    const code = serverMatch.replace(/%%/g, '');

    if (code.includes('server.')) {
      resolvedStr = resolvedStr.replace(serverMatch, 'HiddenEnvironmentVariable');
      error = 'Server variables cannot be resolved in the client.';
    } else {
      const [resolvedCode, err] = resolveCode(code, state);

      if (!resolvedCode) {
        error = err ? err : `Cannot resolve ${query}`;
      } else {
        resolvedStr = resolvedStr.replace(serverMatch, resolvedCode);
        valid = true;
      }
    }
  }

  return [valid, error, resolvedStr];
};

function resolveCode(code, state, customObjects = {}, withError = true, reservedKeyword, isJsCode) {
  let result = '';
  let error;

  // dont resolve if code starts with "queries." and ends with "run()"
  if (code.startsWith('queries.') && code.endsWith('run()')) {
    error = `Cannot resolve function call ${code}`;
  } else {
    try {
      const evalFunction = Function(
        [
          'variables',
          'components',
          'queries',
          'globals',
          'page',
          'client',
          'server',
          'constants',
          'moment',
          '_',
          ...Object.keys(customObjects),
          reservedKeyword,
        ],
        `return ${code}`
      );
      result = evalFunction(
        isJsCode ? state?.variables : undefined,
        isJsCode ? state?.components : undefined,
        isJsCode ? state?.queries : undefined,
        isJsCode ? state?.globals : undefined,
        isJsCode ? state?.page : undefined,
        isJsCode ? undefined : state?.client,
        isJsCode ? undefined : state?.server,
        state?.constants, // Passing constants as an argument allows the evaluated code to access and utilize the constants value correctly.
        moment,
        _,
        ...Object.values(customObjects),
        null
      );
    } catch (err) {
      error = err.toString();
    }
  }

  if (withError) return [result, error];
  return result;
}

export const resolveReferences = (query, validationSchema, customResolvers = {}) => {
  if (!query) return [false, null, null];

  let resolvedValue = query;
  let error = null;

  const currentState = useCurrentStateStore.getState();

  //Todo : remove resolveWorkspaceVariables when workspace variables are removed
  if (query.startsWith('%%') && query.endsWith('%%')) {
    return resolveWorkspaceVariables(query, currentState);
  }

  if ((!validationSchema || isEmpty(validationSchema)) && (!query?.includes('{{') || !query?.includes('}}'))) {
    return [true, error, resolvedValue];
  }

  if (validationSchema && !query?.includes('{{') && !query?.includes('}}')) {
    const [valid, errors, newValue] = validateComponentProperty(query, validationSchema);
    return [valid, errors, newValue, resolvedValue];
  }

  const value = query?.replace(/{{|}}/g, '').trim();

  const { lookupTable } = useResolveStore.getState();

  const { toResolveReference, jsExpression } = inferJSExpAndReferences(value, lookupTable.hints);

  if (toResolveReference && lookupTable.hints.has(toResolveReference)) {
    const idToLookUp = lookupTable.hints.get(toResolveReference);
    resolvedValue = lookupTable.resolvedRefs.get(idToLookUp);

    if (jsExpression) {
      let jscode = value.replace(toResolveReference, resolvedValue);
      jscode = value.replace(toResolveReference, `'${resolvedValue}'`);
      resolvedValue = resolveCode(jscode, currentState);
    }
  } else {
    const [resolvedCode, errorRef] = resolveCode(value, currentState, customResolvers);

    resolvedValue = resolvedCode;
    error = errorRef || null;
  }

  if (!validationSchema || isEmpty(validationSchema)) {
    return [true, error, resolvedValue];
  }

  if (error) {
    return [false, error, query, query];
  }

  if (hasCircularDependency(resolvedValue)) {
    return [false, `${resolvedValue} has circular dependency, unable to resolve`, query, query];
  }

  if (validationSchema) {
    const [valid, errors, newValue] = validateComponentProperty(resolvedValue, validationSchema);
    return [valid, errors, newValue, resolvedValue];
  }
};

export const paramValidation = (expectedType, value) => {
  const type = getCurrentNodeType(value)?.toLowerCase();

  return type === expectedType;
};

const inferJSExpAndReferences = (code, hintsMap) => {
  if (!code) return { toResolveReference: null, jsExpression: null };

  const references = code?.split('.');

  let prevReference;

  let toResolveReference;
  let jsExpression;

  for (let i = 0; i < references?.length; i++) {
    const currentRef = references[i];

    const ref = prevReference ? prevReference + '.' + currentRef : currentRef;

    const existsInMap = hintsMap.has(ref);

    if (!existsInMap) {
      break;
    }

    prevReference = ref;
    toResolveReference = ref;
    jsExpression = code.substring(ref.length);
  }

  return {
    toResolveReference,
    jsExpression,
  };
};

export const FxParamTypeMapping = Object.freeze({
  text: 'Text',
  string: 'Text',
  color: 'Color',
  json: 'Json',
  code: 'Code',
  toggle: 'Toggle',
  select: 'Select',
  alignButtons: 'AlignButtons',
  number: 'Number',
  boxShadow: 'BoxShadow',
  clientServerSwitch: 'ClientServerSwitch',
});

export function computeCoercion(oldValue, newValue) {
  const oldValueType = Array.isArray(oldValue) ? 'array' : typeof oldValue;
  const newValueType = Array.isArray(newValue) ? 'array' : typeof newValue;

  if (oldValueType === newValueType) {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      return [` → ${JSON.stringify(newValue)}`, newValueType, oldValueType];
    }
  } else {
    return [` → ${JSON.stringify(newValue)}`, newValueType, oldValueType];
  }

  return ['', newValueType, oldValueType];
}

export const validateComponentProperty = (resolvedValue, validation) => {
  const validationDefinition = validation?.schema;

  const defaultValue = validation?.defaultValue;

  const schema = _.isUndefined(validationDefinition)
    ? any()
    : generateSchemaFromValidationDefinition(validationDefinition);

  return validate(resolvedValue, schema, defaultValue);
};