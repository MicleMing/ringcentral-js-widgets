import { createProcess } from 'marten';

import Login from 'ringcentral-e2e-test/src/steps/salesforce/login';
import NavigateTo from 'ringcentral-e2e-test/src/steps/salesforce/navigateTo';
import Entry from 'ringcentral-e2e-test/src/steps/entry';
import SettingMyRCPhone from 'ringcentral-e2e-test/src/steps/salesforce/settingMyRCPhone';

export default function SmallCallControlFlow(context) {
  const flow = createProcess(
    Entry,
    Login,
    NavigateTo,
    SettingMyRCPhone,
  )(context);

  return {
    flow,
    endPoint: SettingMyRCPhone
  };
}
