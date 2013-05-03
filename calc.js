(function(){
"use strict";

var vars = {};
var revenue = vars.revenue = new c.Variable({ name: "revenue" });
var outlays = vars.outlays = new c.Variable({ name: "outlays" });
var balance = vars.balance = new c.Variable({ name: "balance" });

var constraints = [
	new c.Equation(c.minus(revenue, outlays), balance, c.Strength.required, 0),
	new c.Inequality(revenue, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(outlays, c.GEQ, 0, c.Strength.required, 0),
	new c.StayConstraint(revenue, c.Strength.medium, 0),
	new c.StayConstraint(outlays, c.Strength.medium, 0),
	new c.StayConstraint(balance, c.Strength.medium, 0)
];

var s = c.extend(new c.SimplexSolver(), {
	onsolved: function(){
		render();
	}
});

constraints.forEach(function(c){ s.addConstraint(c); });
s.resolve();


s.addEditVar(revenue, c.Strength.high).beginEdit()
 .suggestValue(revenue, 100)
 .resolve()
s.endEdit();


var views = document.querySelectorAll("[data-variable]");
var viewForVar = {};
_.forEach(views, function(el){
	viewForVar[el.dataset.variable] = el;
});

function attachControls(){
	var moving;
	var startX;
	var startVal; 
	var budget = document.getElementById("budget");

	budget.addEventListener("mousedown", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		moving = variable;
		startX = e.screenX;
		startVal = variable.value;
		s.addEditVar(variable, c.Strength.high).beginEdit();
	});

	budget.addEventListener("dblclick", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		if(variable.strongStay){
			s.removeConstraint(variable.strongStay);
			variable.strongStay = false;
		} else {
			variable.strongStay = new c.StayConstraint(variable, c.Strength.required, variable.value);
			s.addConstraint(variable.strongStay);
		}
		e.target.classList.toggle("locked");
	});

	budget.addEventListener("mousemove", function(e){
		if(!moving) return;
		s.suggestValue(moving, startVal + e.screenX - startX).resolve();
	});

	budget.addEventListener("mouseup", function(e){
		moving = null;
		s.endEdit();
	});

}

function render(){
	_.each(viewForVar, function(el, varName){
		var variable = vars[varName];
		el.innerHTML = "$" + variable.value;
	});
}

render();
attachControls();


})();