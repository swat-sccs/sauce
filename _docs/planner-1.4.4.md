---
title: "Planner Patch Notes 1.4.4"
date: 2023-08-24
---

The [SCCS Course Planner](https://schedule.sccs.swarthmore.edu) has received a number of
updates from last spring through this summer to make your experience better! First off,
while not a feature per se, it is worth noting that the Course Planner is now
open-source, under the MIT license. The source is available
[on our GitHub](https://github.com/swat-sccs/scheduler) for you to view, build yourself,
follow development, and fork (though we'd prefer you sign up and join our staff to
contribute!).

Our changes have focused largely on the general user interface of the web app. The
Course Planner was not very mobile-friendly, and scaled poorly on larger screens as
well. Many of the incremental fixes to these issues involved tons of specific CSS
changes, rearranging elements and changing how the elements scaled. CSS provides a
`@media` rule that sets properties at specific screen sizes, even without a
sophisticated React- or Bootstrap-based frontend. This allowed us to adjust padding
and layout elements specifically for mobile and large desktop form factors. One key
example of this is in the site's bottom layout, including the class list block and
search bar. You may notice that the behavior is now very different between form
factors: phones and small windows have these blocks expand to near the width of the
screen, matching the calendar and search list. On bigger devices, the padding
is much higher, which looks better. In the future, we will likely apply similar
padding scaling at even higher screen sizes to the calendar and search list.

Another piece of our UI rework that is especially helpful to the average user is the
addition of class *modals*. A modal is a frame that pops up in front of the rest of the
UI to provide details, more information, or super annoying advertisements. We went for
the first two--now, tapping or clicking on a class will bring up a detailed view with
much more information in a nice-looking, mobile-optimized dialog. This has also
enabled us to strip out much of the less important information in each class bubble on
these small form-factor devices, as the details can now be found in the modal.

While there is more work to be done on the UI and UX overall, the Course Planner is
rapidly improving with new features, a better interface, and a more accessible design.
We hope to deliver more improvements soon, and we are excited for people to test these
ones out in the coming year.

Any of this pique your interest? SCCS accepts applications for new staff every semester.
Apply to join our team and help make our services even better for the community!
