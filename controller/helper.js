//Hier werden Helperfunktionen gesetzt die nicht zu den Kernfunktionen zählen, ber die visuelle 
//Handhabung erleichtern.

// ____________________________Modal___________________________________________________________//
// Hole Modal-Objekt
var modal = $('#new-item'),
	btn = $("#open-modal"),
	span = $(".close"),
	newToDom = $('#create-item');

// Öffnet Modal 
btn.click(() => {
	modal.show();
	$('#nt1, #ns1, #ne1, #nd1').parent().children().hide();
	setCategoryListener($('#ntyp').val());
});
// Schließt Modal
span.click(() => {
	modal.hide();
});
// Schließt Modal
newToDom.click(() => {
	modal.hide();
});
// Schließt Modal
$(window).click((event) => {
	if (event.target == modal[0]) {
		modal.hide();
	}
});
//end ____________________________Modal___________________________________________________________//

// Sorgt dafür dass man in der Liste mit Tab zwischen Feldern springen kann und so mehrere Felder pro Datensatz bearbeiten kann.
var stayEditable = (ident, field, currentEditing) => {
	if (currentEditing && currentEditing !== "") {
		var focus = document.querySelector('[ident="' + ident + '"][field=' + field + ']');
		document.getElementById(currentEditing).className = 'editing';
		if (focus !== null) focus.focus();
	}
};

//Kategorie-Auswahl für Modalfenster. Wechselt Ansicht je nach Option.
function setCategoryListener(selector) {
	if (selector.toLowerCase() === "project") {
		//task, startzeit, endzeit verstecken
		$('#nt1, #ns1, #ne1').parent().children().hide();
	}
	if (selector.toLowerCase() === "task") {
		//task, startzeit, endzeit verstecken
		$('#ns1, #ne1').parent().children().hide();
		$('#nt1').parent().children().show();
	}
	if (selector.toLowerCase() === "aufwand") {
		//task, startzeit, endzeit verstecken
		$('#nt1, #ns1, #ne1').parent().children().show();
	}
}

//Listener für Kategorie-Auswahl
function setUpCategoryListener() {
	$(".category.form-control").change((event) => {
		setCategoryListener(event.target.value);
	});
}
setUpCategoryListener();

function shifttimes(item) {


}

//Finde alle Tasks in respektive zum ausgewählten Task im Modalfenster
ListenerComboBox = function (event) {
	let target = event.target;
	$(target).closest('.input-group').children('input').val($(target).text().trim());
};