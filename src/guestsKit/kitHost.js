// THE SHELL'S OWN ACTIONS (G2c-2a, 11/28/2026). The kit's screens are shared:
// hostv4 shows them on its own, and there a few steps ("set the place", "sign
// in", "import a list") lead to the current app. hostv2 shows them inside
// itself, where each of those steps is one of its own sheets, so it hands the
// kit those actions here and nothing points elsewhere. No provider (hostv4):
// null, and every screen keeps its link.
//
//   openSignIn   hostv2's sign-in sheet, over Guests (the kit itself never signs in)
//   date, venue  hostv2's Date & time and Venue sheets
//   photo        hostv2's invite page design (it holds the photo)
//   qr           hostv2's QR code
//   importList   hostv2's list import
//   sendDetails  hostv2's "send the day's details"
//   previewSrc   (id) => the guest page's URL for the preview frame
import { createContext, useContext } from 'react';

export const KitHostContext = createContext(null);
export const useKitHost = () => useContext(KitHostContext);
