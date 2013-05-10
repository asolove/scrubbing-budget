(function(){
"use strict";

var vars = {};
var revenues = vars.revenues = new c.Variable({ name: "revenues" });
var spending = vars.spending = new c.Variable({ name: "spending" });
var surplus = vars.surplus = new c.Variable({ name: "surplus" });
var deficit = vars.deficit = new c.Variable({ name: "deficit" });


var taxRates = [10, 15, 25, 28, 33, 35, 39.6];
// FIXME: real numbers
var dollarsInBracket = [1, 2, 3, 4, 5, 6, 13];

taxRates.forEach(function(rate, i){
	vars["tax-bracket-"+i] = new c.Variable({ name: "tax-bracket-"+i, value: rate });
});

/* spending */
var socialsecurity = vars.socialsecurity = new c.Variable({ name: "socialsecurity", value: 725 });
var medicaid = vars.medicaid = new c.Variable({ name: "medicaid", value: 275 });
var medicare = vars.medicare = new c.Variable({ name: "medicare", value: 480 });
var mandatoryother = vars.mandatoryother = new c.Variable({ name: "mandatoryother", value: 545 });
var defense = vars.defense = new c.Variable({ name: "defense", value: 700 });
var nondefense = vars.nondefense = new c.Variable({ name: "nondefense", value: 646 });
var interest = vars.interest = new c.Variable({ name: "interest", value: 227 });

var constraints = [
	new c.Equation(c.minus(revenues, spending), surplus, c.Strength.required, 0),
	new c.Equation(c.minus(0, surplus), deficit, c.Strength.required, 0),
	new c.Inequality(revenues, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(spending, c.GEQ, 0, c.Strength.required, 0),

	new c.StayConstraint(socialsecurity, c.Strength.medium, 0),
	new c.StayConstraint(medicaid, c.Strength.medium, 0),
	new c.StayConstraint(medicare, c.Strength.medium, 0),
	new c.StayConstraint(mandatoryother, c.Strength.medium, 0),
	new c.StayConstraint(defense, c.Strength.medium, 0),
	new c.StayConstraint(nondefense, c.Strength.medium, 0),
	new c.StayConstraint(interest, c.Strength.medium, 0),
	new c.Inequality(socialsecurity, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(medicaid, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(medicare, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(mandatoryother, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(defense, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(nondefense, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(interest, c.GEQ, 0, c.Strength.required, 0),
	new c.Equation(spending, c.plus(socialsecurity, c.plus(medicaid, c.plus(medicare, c.plus(mandatoryother, c.plus(defense, c.plus(nondefense, interest)))))), c.Strength.required, 10)
];

var incomeTaxRevenue = new c.Expression(0);
taxRates.forEach(function(rate, i){
	var rate = vars["tax-bracket-"+i];
	var nextRate = vars["tax-bracket-"+(i+1)] || 100;

	constraints.splice(0,0,
		new c.Inequality(rate, c.LEQ, nextRate, c.Strength.required, 0),
		new c.Inequality(rate, c.GEQ, 0, c.Strength.required, 0),
		new c.StayConstraint(rate, c.Strength.medium, 0)
	);

	incomeTaxRevenue = (new c.Expression(rate)).times(dollarsInBracket[i]).plus(incomeTaxRevenue);
	console.log(rate, dollarsInBracket[i]);
});

var incomeTax = vars.incomeTax = new c.Variable({ name: "incomeTax", value: 1100 });
constraints.push(new c.Equation(incomeTax, incomeTaxRevenue, c.Strength.required, 0));
var corporateTax = vars.corporateTax = new c.Variable({ name: "corporateTax", value: 181 });
var socialTax = vars.socialTax = new c.Variable({ name: "socialTax", value: 819 });
var otherTax = vars.otherTax = new c.Variable({ name: "otherTax", value: 211 });


constraints.push(new c.StayConstraint(corporateTax, c.Strength.strong, 0));
constraints.push(new c.StayConstraint(socialTax, c.Strength.strong, 0));
constraints.push(new c.StayConstraint(otherTax, c.Strength.strong, 0));

constraints.push(
	new c.Equation(c.plus(c.plus(incomeTax, corporateTax), c.plus(socialTax, otherTax)), 
			revenues, c.Strength.required, 0)
);

var s = c.extend(new c.SimplexSolver(), {
	onsolved: function(){
		render();
	}
});

constraints.forEach(function(c){ s.addConstraint(c); });
s.resolve();


var views = document.querySelectorAll("[data-variable]");
var viewsForVar = {};
_.forEach(views, function(el){
	viewsForVar[el.dataset.variable] ? 
		viewsForVar[el.dataset.variable].push(el) : 
		viewsForVar[el.dataset.variable] = [el];
});

var scales = {
	overview: .1,
	zoomed: .4
};

function scale(el, val){
	return (val > 0 ? val : 0) * (scales[el.dataset.scale] || 1);
}

function unscale(el, val){
	return val / (scales[el.dataset.scale] || 1);
}

function attachControls(){
	var moving;
	var movingView;
	var startX;
	var startVal; 

	document.body.addEventListener("mousedown", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		moving = variable;
		movingView = e.target;
		startX = e.screenX;
		startVal = variable.value;
		if(variable.strongStay) s.removeConstraint(variable.strongStay);
		s.addEditVar(variable, c.Strength.high).beginEdit();
	});

	document.body.addEventListener("dblclick", function(e){
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

	document.body.addEventListener("mousemove", function(e){
		if(!moving) return;
		var newValue = startVal + unscale(movingView, e.screenX - startX);
		s.suggestValue(moving, newValue).resolve();
	});

	document.body.addEventListener("mouseup", function(e){
		if(!moving) return;

		s.endEdit();
		if(moving.strongStay) s.addConstraint(moving.strongStay);
		moving = null;
	});

}

var formatters = {
	bar: function(el, variable){
		el.style.width = scale(el, variable.value) + "px";
		el.innerHTML = "<span>" + variable.name + " <small>$" + Math.round(variable.value) + "b</small></span>";
	},

	percent: function(el, variable){
		el.innerHTML = (variable.value).toFixed(0) + "%";
	},

	dollars: function(el, variable){
		el.innerHTML = "$" + (variable.value.toFixed(2));
	}
};

var id = function(a){ return a; };

function render(){
	_.each(viewsForVar, function(els, varName){
		var variable = vars[varName];
		_.each(els, function(el){
			formatters[el.dataset.format](el, variable);
		});
	});
}

render();
attachControls();
console.log(s);
console.log(surplus);


})();