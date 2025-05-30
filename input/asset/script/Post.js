// TODO: sticker-header

// const stickyHeaders = Array.from(
//   document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
// );

// function updateStickyHeaders() {
//   let newActiveHeader = null;

//   // Find the new active header: the last one in DOM order
//   // that is currently at the top of the viewport.
//   for (let i = stickyHeaders.length - 1; i >= 0; i--) {
//     const header = stickyHeaders[i];
//     const rect = header.getBoundingClientRect();
//     // Condition for being "stuck" at the top:
//     // top <= 1px (allows for subpixel rendering variance)
//     // and bottom > 1px (ensures it's not scrolled completely past)
//     // and height > 0 (ensures it's a rendered element)
//     if (rect.top <= 1 && rect.bottom > 1 && rect.height > 0) {
//       newActiveHeader = header;
//       break;
//     }
//   }

//   // Update classes for all headers based on the newActiveHeader
//   stickyHeaders.forEach((header) => {
//     const rect = header.getBoundingClientRect();
//     const isEffectivelyStuck =
//       rect.top <= 1 && rect.bottom > 1 && rect.height > 0;

//     if (header === newActiveHeader) {
//       // This is the currently active sticky header
//       header.classList.add("current-sticky-header");
//       header.classList.remove("sticky-obscured");
//     } else {
//       // This is not the active sticky header
//       header.classList.remove("current-sticky-header");
//       if (isEffectivelyStuck) {
//         // If it's stuck but not active, it's obscured by the active one
//         header.classList.add("sticky-obscured");
//       } else {
//         // If it's not stuck at all, it shouldn't be marked as obscured
//         header.classList.remove("sticky-obscured");
//       }
//     }
//   });
// }

// // Add event listeners
// // Use { passive: true } for scroll for potential performance benefits
// window.addEventListener("scroll", updateStickyHeaders, { passive: true });
// window.addEventListener("resize", updateStickyHeaders);
// // Initial check when the DOM is loaded
// document.addEventListener("DOMContentLoaded", updateStickyHeaders);
