$(() => {
  // aktywacja aktualnie załadowanej strony w navbarze
  let url = document.documentURI;
  $(".navLinks").removeClass("active");
  if (url.includes("index")) {
    $("#indexLink").addClass("active");
  } else if (url.includes("form")) {
    $("#formLink").addClass("active");
  } else if (url.includes("measure")) {
    $("#measureLink").addClass("active");
  } else if (url.includes("glossary")) {
    $("#glossLink").addClass("active");
  }
});
