import '../reporter';
import { compile } from '../utils/template';

// TODO configuration-based.
jest.setTimeout(1000 * 60);

const _test = test;
const _describe = describe;
const _beforeAll = beforeAll;
const _beforeEach = beforeEach;
const _afterAll = afterAll;
const _afterEach = afterEach;

function mergeTags(tags, supersetTags) {
  if (Array.isArray(tags) && tags.length === 0) {
    return supersetTags;
  }
  const mergedTags = [];
  tags.forEach(([project, tag]) => {
    const matchTag = supersetTags.find(([_project]) => _project === project);
    if (matchTag) {
      const [_project, _tag] = matchTag;
      mergedTags.push([_project, {
        ..._tag,
        ...tag
      }]);
    }
  });
  return mergedTags;
}

function flattenTags(tags) {
  const _tags = Object.entries(tags)
    .map(
      ([name, values]) => values
        .map(value => `${name}-${typeof value === 'object' ? Object.keys(value)[0] : value}`)
    );
  const groups = [];
  const group = [];
  const getGroups = (_tags, depth = 0) => {
    for (let i = 0; i < _tags[depth].length; i += 1) {
      group[depth] = _tags[depth][i];
      if (depth !== _tags.length - 1) {
        getGroups(_tags, depth + 1);
      } else {
        groups.push([...group]);
      }
    }
  };
  getGroups(_tags);
  return groups;
}

function restoreTags(group, project) {
  return group.reduce((_group, name) => {
    const [key, value] = name.split('-');
    return {
      ..._group,
      [key]: value,
    };
  }, {
    project
  });
}

function getTags({
  rawTags, defaultTestConfig, caseTags
}) {
  let tags;
  if (rawTags.length === 0) {
    tags = defaultTestConfig.map(([_project, _tags]) => ([
      _project,
      {
        ..._tags,
        ...caseTags,
      }
    ]));
  } else {
    tags = rawTags.map(([_project, _tags]) => ([
      _project,
      {
        ...caseTags,
        ..._tags,
      }
    ]));
  }
  return tags;
}

function checkSkippedCase({ project, ...execTag }, [_, caseTag]) {
  if (!caseTag) return true;
  for (const [name, value] of Object.entries(execTag)) {
    const currentCaseTag = caseTag[name].map(item => (
      typeof item === 'object' ? Object.keys(item)[0] : item
    ));
    if (!Array.isArray(caseTag[name]) || currentCaseTag.indexOf(value) === -1) return true;
  }
  return false;
}

async function beforeEachStart({ driver, isSandbox }) {
  // TODO HOOK
}

async function afterEachEnd({ driver, isSandbox }) {
  // TODO HOOK
  if (isSandbox) await driver.close();
}

function testCase(caseParams, fn) {
  const {
    title,
    options = [{}],
    tags: rawTags = [],
    modes = [],
  } = caseParams;
  const defaultTestConfig = global.defaultTestConfig;
  const { projects, ...params } = global.execGlobal.params;
  const caseTags = Object.entries(caseParams).reduce((_params, [name, _tag]) => {
    const isGeneralParam = Object.keys(params).indexOf(name) > -1;
    if (!isGeneralParam) return _params;
    return {
      ..._params,
      [name]: _tag
    };
  }, {});
  // case setting merged.
  const tags = getTags({ rawTags, defaultTestConfig, caseTags });
  // case setting merged withdefaultTestConfig .
  const testCaseTags = mergeTags(tags, defaultTestConfig);
  const execTags = mergeTags(global.execTags, testCaseTags).map(([_project, _tags]) => (
    [_project, { ..._tags, drivers: [...global.execDrivers] }]
  ));
  const isSandbox = [...modes, ...global.execModes].indexOf('sandbox') > -1;
  global.testBeforeAll({
    testCaseTags,
    execTags,
  });
  for (const driver of global.execDrivers) {
    for (const [project, { drivers, ...tags }] of execTags) {
      const groups = flattenTags(tags);
      for (const group of groups) {
        for (const option of options) {
          const tag = restoreTags(group, project);
          const caseTag = testCaseTags.find(([_project]) => _project === project);
          const isSkipped = checkSkippedCase({ ...tag, drivers: driver }, caseTag);
          if (isSkipped) {
            // console.warn(`\`${title}\` is skipped.`);
            _test.skip('skip case', () => {});
            break;
          }
          const name = compile({
            template: title,
            keys: Object.keys(option),
            values: Object.values(option),
          });
          const tail = ` => (${project} in ${group.join(' & ')} on ${driver})`;
          const { config, instance } = global.testBeforeEach({
            caseParams,
            option,
            tag,
          }, {
            drivers: global.drivers,
            driver,
            modes,
            isSandbox,
          });
          global.beforeEach(beforeEachStart.bind(null, { driver: instance.driver, isSandbox }));
          global.afterEach(afterEachEnd.bind(null, { driver: instance.driver, isSandbox }));
          /* eslint-disable */
          const func = async function ({ instance, isSandbox, config, ...args }) {
            // TODO handle type in `config`
            if (isSandbox) {
              await instance.driver.run();
              await instance.driver.newPage();
            }
            await instance.driver.goto(config);
            global.$ = instance.query;
            global.browser = instance.driver.browser;
            global.page = instance.driver.page;
            // TODO HOOK
            await fn({ ...args, isSandbox, config});
          };
          /* eslint-enable */
          _test(`${name}${tail}`, func.bind(null, {
            instance,
            config,
            option,
            tag,
            driver,
            modes,
            isSandbox,
          }));
        }
      }
    }
  }
}

// TODO: inherit nativeDescribe／nativeTest(concurrent/only/skip)

function testDescribe(...args) {
  return _describe(...args);
}

global.test = testCase;
global.describe = testDescribe;