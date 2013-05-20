(function(){
"use strict";

var vars = {};
var revenues = vars.revenues = new c.Variable({ name: "revenues" });
var spending = vars.spending = new c.Variable({ name: "spending" });
var surplus = vars.surplus = new c.Variable({ name: "surplus" });
var deficit = vars.deficit = new c.Variable({ name: "deficit" });


var taxRates = [10, 15, 25, 28, 33, 35, 39.6];
// FIXME: real numbers
var dollarsInBracket = [0.1, 0.2, 0.5, 2, 3, 5, 20];

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
	var revenueForBracket = new c.Expression(rate).times(dollarsInBracket[i]);
	var varName =  "tax-bracket-"+i+"-revenue";
	var revenueForBracketVar = vars[varName] = new c.Variable({ name: varName });

	constraints.splice(0,0,
		new c.Inequality(rate, c.LEQ, c.minus(nextRate, 1), c.Strength.required, 0),
		new c.Inequality(rate, c.GEQ, 0, c.Strength.required, 0),
		new c.Equation(revenueForBracketVar, revenueForBracket, c.Strength.required, 0),
		new c.StayConstraint(rate, c.Strength.medium, 0)
	);

	incomeTaxRevenue = revenueForBracket.plus(incomeTaxRevenue);
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

var s = c.extend(new c.SimplexSolver(), { onsolved: render });

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
	zoomed: 1,
	taxRate: 4
};

function scale(el, val){
	return (val > 0 ? val : 0) * (scales[el.dataset.scale] || 1);
}

function unscale(el, val){
	return val / (scales[el.dataset.scale] || 1);
}

// find nearest thing with a variable
function findTarget(el){
	if(el.dataset.variable) return el;
	if(el.parentNode.dataset.variable) return el.parentNode;
	return el;
}

// fixme: locked css class should be propagated by event, not here
function removeStay(variable, el){
	if(variable.stayConstraint){
		s.removeConstraint(variable.stayConstraint);
		variable.stayConstraint = false;
		el.classList.remove("locked");
	}
}

function addStay(variable, el){
	if(!variable.stayConstraint){
		variable.stayConstraint = new c.StayConstraint(variable, c.Strength.required, variable.value);
		s.addConstraint(variable.stayConstraint);
		el.classList.add("locked");
	}
}

function toggleStay(variable, el){
	(variable.stayConstraint ? removeStay : addStay)(variable, el);
}

function attachControls(){
	var moving;
	var movingView;
	var startX;
	var startVal; 

	document.body.addEventListener("mousedown", function(e){
		var target = findTarget(e.target);
		var varName = target.dataset.variable;
		var variable = vars[varName];

		if(!variable) return;
		if(e.target.tagName === "LABEL") return toggleStay(variable, target)

		moving = variable;
		movingView = target;
		startX = e.screenX;
		startVal = variable.value;
		if(variable.stayConstraint) s.removeConstraint(variable.stayConstraint);
		s.addEditVar(variable, c.Strength.high).beginEdit();
	});

	document.body.addEventListener("mousemove", function(e){
		if(!moving) return;
		var newValue = startVal + unscale(movingView, e.screenX - startX);
		s.suggestValue(moving, newValue).resolve();
	});

	document.body.addEventListener("mouseup", function(e){
		if(!moving) return;

		s.endEdit();
		if(moving.stayConstraint){
			moving.stayConstraint.expression.constant = moving.value;
			s.addConstraint(moving.stayConstraint);
		}
		moving = null;
	});
}

var formatters = {
	barSection: function(el, variable){
		el.style.width = scale(el, variable.value) + "px";
		[].slice.call(el.querySelectorAll("[data-format]")).forEach(function(el){
			formatters[el.dataset.format](el, variable);
		});
	},

	taxRate: function(el, variable){
		el.style.width = scale(el, variable.value) + "px";
	},

	bDollars: function(el, variable){
		el.innerHTML = "$" + variable.value.toFixed(0) + "b";
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


	// update zoom location markers
	var zoomedViews = [].slice.call(document.querySelectorAll(".zoomed .row"));
	var overviewZoomedViews = [].slice.call(document.querySelectorAll(".overview .shown"));

	if(zoomedViews.length !== 2){
		overviewZoomedViews.forEach(function(node){
			node.parentNode.removeChild(node);
		});
	} else {
		var zoomRatio = 10;
		[0,1].forEach(function(i){
			zoomedViews[i].addEventListener("scroll", function(e){
				var left = e.target.scrollLeft;
				overviewZoomedViews[i].style.left = left/zoomRatio+"px";
			});
		});
	}

}


render();
attachControls();


})();