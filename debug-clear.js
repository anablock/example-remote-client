// Quick debug script to clear localStorage
// Run this in browser console to reset state

console.log('Current localStorage keys:', Object.keys(localStorage));
localStorage.clear();
console.log('localStorage cleared');
window.location.reload();