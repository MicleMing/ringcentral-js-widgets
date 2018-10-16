/* eslint-disable */
/* global $, page, browser, driver, context */

import SmallCallControlFlow from '../flows/smallCallControlFlow';
import SmallCallControlCheck from '../checks/smallCallControlCheck';

describe('Test: small call control', () => {
  test({
    title: 'small call control',
    tags: [
      ['salesforce'],
    ],
    levels: ['p0'],
    options: [
      { accountTag: 'rc_uk_sfentity', username: '+448451030178*301', password: 'Test!123' },
    ],
  }, async ({ option, isVirtual }) => {
    const { flow, endPoint } = SmallCallControlFlow(context);
    await flow.execTo(endPoint);
  });
});
