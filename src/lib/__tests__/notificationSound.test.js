// notifyMessageArrival() pairs the chime with a haptic tick — the gap this
// closed: the inbound-message effect used to call playMessageChime() alone,
// so message arrival was the one real-time moment with sound but no haptic.
import { notifyMessageArrival, setMessageSoundMuted, isMessageSoundMuted } from '../notificationSound';

describe('notifyMessageArrival', () => {
  let vibrateSpy;
  beforeEach(() => {
    vibrateSpy = jest.fn();
    navigator.vibrate = vibrateSpy;
    setMessageSoundMuted(false);
  });

  test('triggers a haptic pattern when unmuted', () => {
    notifyMessageArrival();
    expect(vibrateSpy).toHaveBeenCalledTimes(1);
    expect(vibrateSpy).toHaveBeenCalledWith(expect.any(Array));
  });

  test('does not vibrate when muted', () => {
    setMessageSoundMuted(true);
    notifyMessageArrival();
    expect(vibrateSpy).not.toHaveBeenCalled();
    expect(isMessageSoundMuted()).toBe(true);
    setMessageSoundMuted(false);
  });

  test('never throws when navigator.vibrate is unsupported (e.g. iOS Safari)', () => {
    delete navigator.vibrate;
    expect(() => notifyMessageArrival()).not.toThrow();
  });
});
