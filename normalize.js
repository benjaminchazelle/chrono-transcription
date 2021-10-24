module.exports = function normalize(str) {
	return str
		.normalize("NFD")
		.replace(/'/g, "")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, " ")
		.split(" ")
		.filter(word => word.length)
;
}
