# Results entry script for the club's Google Sheet

`Code.gs` adds results entry to the sheet **Easington SAC Results 2026-27**:

- a **Club** menu in the sheet (on a computer): *Add match results*, *Add an angler*, and *Copy Enter Match to Results*
- the same forms as a **phone page** for the weigh-in (the Google Sheets phone app can't show custom menus)

It saves with the Google login of whoever uses it, so only people the sheet is shared with as **Editor** can add results.

## Install (on a computer, about 5 minutes)

1. Open the sheet and choose **Extensions → Apps Script**.
2. Delete everything in the `Code.gs` box, paste in the whole of `Code.gs` from this folder, and click **Save** (the disk icon). Name the project *Club results*.
3. In the toolbar's function list choose **setUp**, then click **Run**. Google asks for permission: choose your account, then **Advanced → Go to Club results (unsafe) → Allow**. ("Unsafe" only means Google hasn't reviewed this club's own script.)
4. Go back to the sheet and reload it. A **Club** menu appears next to Help.

## Phone page for the match secretary

1. In Apps Script, click **Deploy → New deployment**, click the cog and choose **Web app**.
2. Set **Execute as** to *User accessing the web app* and **Who has access** to *Anyone with Google account*.
3. Click **Deploy** and copy the **Web app URL**.
4. Send that link to the match secretary. They open it on their phone, sign in with the Google account the sheet is shared with, allow it once, and add it to their home screen.
   - Add `?page=angler` to the end of the link for the *Add an angler* form.

After changing `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version** so the phone page picks up the change.

## A button on the Enter Match tab (optional)

On a computer: **Insert → Drawing**, draw a box saying *Add match to Results*, save it onto the Enter Match tab, click its ⋮ menu → **Assign script** and type `copyEnterMatch`.
