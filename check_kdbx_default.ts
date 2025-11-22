import kdbxweb from 'kdbxweb';
console.log("Default export keys:", Object.keys(kdbxweb));
// @ts-ignore
if (kdbxweb.Group) console.log("Group found on default export");
// @ts-ignore
if (kdbxweb.kdbxweb) console.log("kdbxweb property found on default export");
