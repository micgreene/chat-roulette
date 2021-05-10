'use strict';

function emojis(text) {
  text = text.split('\n')[0] === '**lol' ? `"(^v^)"\n` : text;
  return text;
}

//keeps a list of devs for the project and their contact info
function authors() {
  const lIn = `https://www.linkedin.com/in/`
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: `${lIn}dlcalhoun` },
    anne: { name: 'Anne Thorsteinson  ', linkedin: `${lIn}annethor` },
    cody: { name: 'Cody Carpenter     ', linkedin: `${lIn}callmecody` },
    mike: { name: 'Michael Greene     ', linkedin: `${lIn}michael-greene-b7879774/`}
  };
  return projectAuthors;
}


module.exports = {
  emojis: emojis,
  authors: authors,
}
