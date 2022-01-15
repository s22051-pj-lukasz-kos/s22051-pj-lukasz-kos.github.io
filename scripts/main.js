$(() => {
  console.log("jquery works!");

  // płótno
  let can = document.getElementById("katomierz").getContext("2d");

  // poszczególne ustawienia
  const baerwald = {
    np1: 660,
    np2: 1209,
  };
  const loefgren = {
    np1: 703,
    np2: 1166,
  };
  const stevenson = {
    np1: 603,
    np2: 1174,
  };

  // klasa do tworzenia współrzędnych
  class Coordinates {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  // klasa obsługująca funkcje liniowe
  class LinearFunction {
    constructor(a, b) {
      this.a = a;
      this.b = b;
    }
  }

  // zmienna zawierająca współrzędne trzpienia
  const spindle = new Coordinates(400, 800);
  let armPivot = new Coordinates(400, undefined);

  // klasa do wyszukiwania współrzędnych punktów zerowych
  class InnerNullPointCoord extends Coordinates {
    constructor(alignment, y) {
      let x = Math.sqrt(Math.pow(alignment.np1, 2) - Math.pow(y, 2));
      super(x, y);
      this.alignment = alignment;
    }
  }

  /*
    klasa zawierająca informacje startowe:
    mount dist, współrzędne osi ramienia gramofonu, współrzędne trzpienia 
  */
  class MountingDistanceParams {
    constructor(mountingDistanceMM, spindle, armPivot) {
      let armPivotY = spindle.y - mountingDistanceMM * 10;
      this.armPivot = armPivot;
      this.armPivot.y = armPivotY;
      this.mountingDistance = mountingDistanceMM * 10;
      this.spindle = spindle;
    }
  }

  /* 
    tablica do przechowywania parametrów
    dla poszczególnych wewnętrznych punktów zerowych 
  */
  let calcComponents = [];

  // klasa licząca parametry
  class CalcComponent {
    constructor(mountingDistanceParams, innerNullPointCoord) {
      this.mountingDistanceParams = mountingDistanceParams;
      this.innerNullPointCoord = innerNullPointCoord;
      this.effectiveLength = this.calcEffectiveLength();
      this.overhang = this.calcOverhang();
      this.innerLOC = this.calcInnerLOC();
      this.locDifference = this.calcLocDifference();
    }

    // odległość skuteczna dla podanego wewnętrznego punktu zerowego
    calcEffectiveLength() {
      let effectiveLength = 0;
      effectiveLength = Math.hypot(
        this.innerNullPointCoord.x,
        this.innerNullPointCoord.y +
          this.mountingDistanceParams.mountingDistance
      );
      return effectiveLength;
    }

    // przewieszenie
    calcOverhang() {
      let overhang = 0;
      overhang =
        this.effectiveLength - this.mountingDistanceParams.mountingDistance;
      return overhang;
    }

    /* 
    Prawo cosinusów.
    Przekazany argument decyduje o obliczeniach dla konkretnego punktu zerowego
    1 liczy kąt dla wewnętrznego punktu zerowego
    2 liczy kąt dla zewnętrznego punktu zerowego
    */
    lawOfCosines(number) {
      let loc = 0;
      if (number === 1) {
        loc =
          (Math.pow(this.innerNullPointCoord.alignment.np1, 2) +
            Math.pow(this.effectiveLength, 2) -
            Math.pow(this.mountingDistanceParams.mountingDistance, 2)) /
          (2 * this.innerNullPointCoord.alignment.np1 * this.effectiveLength);
      } else if (number === 2) {
        loc =
          (Math.pow(this.innerNullPointCoord.alignment.np2, 2) +
            Math.pow(this.effectiveLength, 2) -
            Math.pow(this.mountingDistanceParams.mountingDistance, 2)) /
          (2 * this.innerNullPointCoord.alignment.np2 * this.effectiveLength);
      }
      return loc;
    }

    // oblicz kąt dla wewnętrznego punktu zerowego
    calcInnerLOC() {
      let loc = 0;
      loc = this.lawOfCosines(1);
      return loc;
    }

    // różnica w prawie cosinusów między punktami zerowymi
    calcLocDifference() {
      let outerLoc = 0;
      outerLoc = this.lawOfCosines(2);
      let locDifference = 0;
      locDifference = Math.abs(this.innerLOC - outerLoc);
      return locDifference;
    }
  }

  // nasłuch na przycisk od formularza
  $("#formBtn").on("click", () => {
    validateForm();
  });

  // funkcja, która odpala się po wypełnieniu formularza i wciśnięciu przycisku
  function validateForm() {
    // pobiera odległość montażową z formularza
    let mountingDistance = document.getElementById("inputMountDist").value;
    let text;
    if (
      isNaN(mountingDistance) ||
      mountingDistance < 150 ||
      mountingDistance > 500
    ) {
      text = "Odległość montażowa powinna wynosić od 150 do 500mm";
    } else {
      text = "";

      let mountingDistanceParams = new MountingDistanceParams(
        mountingDistance,
        spindle,
        armPivot
      );

      // dokonuje obliczeń, by znaleźć najlepsze możliwe parametry dla poszczególnych ustawień
      let baerResult = calculations(mountingDistanceParams, baerwald);
      calcComponents = [];
      let loefResult = calculations(mountingDistanceParams, loefgren);
      calcComponents = [];
      let stevResult = calculations(mountingDistanceParams, stevenson);
      calcComponents = [];

      // następnie wywoływana jest funkcja, która umieszcza dane w tabeli
      fillTable(mountingDistanceParams, baerResult, loefResult, stevResult);

      // pobiera typ kątomierza z formularza i na jego podstawie pobiera odpowiednie ustawienie
      // i wyliczone parametry
      let result;
      if ($("#radioBaer").prop("checked")) {
        result = baerResult;
      } else if ($("#radioLoef").prop("checked")) {
        result = loefResult;
      } else if ($("#radioSteven").prop("checked")) {
        result = stevResult;
      }

      // i na bazie tych ustawień rysuje kątomierz do gramofonu
      drawProtractor(can, result);
    }
    // umieszcza tekst pod inputem w razie, gdyby dane wejściowe nie mieściły się w zakresie
    $("#inputMessageField").text(text);
  }

  // funkcja licząca wszystkie parametry dla serii wewnętrznych punktów zerowych o różnych współrzędnych
  // zwraca szukane optymalne parametry dla gramofonu
  function calculations(mountingDistanceParams, alignment) {
    let y = 300;

    // dokonuje serii obliczeń dla wewnętrznego punktu zerowego
    do {
      let innerNullPointCoord = new InnerNullPointCoord(alignment, y);
      let calcComponent = new CalcComponent(
        mountingDistanceParams,
        innerNullPointCoord
      );

      // jeśli różnica między wewnętrznym, a zewnętrznym kątem przegięcia jest większa niż jeden stopień to przyśpiesz liczenie
      if (calcComponent.locDifference > 0.02) {
        y -= 20;
      } else {
        // lub dodaj do tablicy
        y -= 1;
        calcComponents.push(calcComponent);
      }
    } while (y >= 0);

    // sortuje tablicę i zwraca porządany wynik
    calcComponents.sort((a, b) => {
      return a.locDifference - b.locDifference;
    });
    return calcComponents[0];
  }

  // funkcja do wypełniania tablicy na stronie
  function fillTable(
    mountingDistanceParams,
    baerResult,
    loefResult,
    stevResult
  ) {
    // odległość montażowa
    let mountingDistance = mountingDistanceParams.mountingDistance / 10;
    $("#baerMountingDistance").text(mountingDistance);
    $("#loefMountingDistance").text(mountingDistance);
    $("#stevMountingDistance").text(mountingDistance);

    // odległość skuteczna
    $("#baerEffectiveLength").text(
      (baerResult.effectiveLength / 10).toFixed(2)
    );
    $("#loefEffectiveLength").text(
      (loefResult.effectiveLength / 10).toFixed(2)
    );
    $("#stevEffectiveLength").text(
      (stevResult.effectiveLength / 10).toFixed(2)
    );

    // przewieszenie
    $("#baerOverhang").text((baerResult.overhang / 10).toFixed(2));
    $("#loefOverhang").text((loefResult.overhang / 10).toFixed(2));
    $("#stevOverhang").text((stevResult.overhang / 10).toFixed(2));

    // kąt przegięcia
    $("#baerOffsetAngle").text(getDegrees(baerResult));
    $("#loefOffsetAngle").text(getDegrees(loefResult));
    $("#stevOffsetAngle").text(getDegrees(stevResult));

    // przesunięcie liniowe
    $("#baerLinearOffset").text(linearOffset(baerResult));
    $("#loefLinearOffset").text(linearOffset(loefResult));
    $("#stevLinearOffset").text(linearOffset(stevResult));

    // wewnętrzny punkt zerowy
    $("#baerInnerNullPoint").text(
      baerResult.innerNullPointCoord.alignment.np1 / 10
    );
    $("#loefInnerNullPoint").text(
      loefResult.innerNullPointCoord.alignment.np1 / 10
    );
    $("#stevInnerNullPoint").text(
      stevResult.innerNullPointCoord.alignment.np1 / 10
    );

    // zewnętrzny punkt zerowy
    $("#baerOuterNullPoint").text(
      baerResult.innerNullPointCoord.alignment.np2 / 10
    );
    $("#loefOuterNullPoint").text(
      loefResult.innerNullPointCoord.alignment.np2 / 10
    );
    $("#stevOuterNullPoint").text(
      stevResult.innerNullPointCoord.alignment.np2 / 10
    );
  }

  // funkcja do konwersji LOC na kąt w stopniach
  function getDegrees(result) {
    let asin = Math.asin(result.innerLOC);
    let degrees = asin * (180 / Math.PI);
    return degrees.toFixed(2);
  }

  // funkcja do liczenia przesunięcia liniowego
  function linearOffset(result) {
    let linear = (result.effectiveLength / 10) * result.innerLOC;
    return linear.toFixed(2);
  }

  // funkcja do liczenia pozycji zewnętrznego punktu zerowego
  function calcOuterNullPointCoord(result) {
    // obliczyć y
    let numerator =
      -Math.pow(result.mountingDistanceParams.armPivot.y, 2) +
      Math.pow(result.effectiveLength, 2) +
      Math.pow(result.mountingDistanceParams.spindle.y, 2) -
      Math.pow(result.innerNullPointCoord.alignment.np2, 2);

    let denominator =
      2 * result.mountingDistanceParams.spindle.y +
      2 * -result.mountingDistanceParams.armPivot.y;

    let outerNullPointY = numerator / denominator;

    // obliczyć x z rozwiązania funkcji kwadratowej
    let b = 2 * -result.mountingDistanceParams.spindle.x;
    let c =
      Math.pow(result.mountingDistanceParams.spindle.x, 2) +
      Math.pow(outerNullPointY - result.mountingDistanceParams.spindle.y, 2) -
      Math.pow(result.innerNullPointCoord.alignment.np2, 2);
    let delta = Math.sqrt(Math.pow(b, 2) - 4 * c);

    let outerNullPointX = (-b + delta) / 2;

    let outerNullPointCoord = new Coordinates(outerNullPointX, outerNullPointY);
    return outerNullPointCoord;
  }

  // funkcja znajdująca równanie funkcji liniowej na bazie współrzędnych dwóch punktów
  function linearFunction(x1, y1, x2, y2) {
    let a = (y2 - y1) / (x2 - x1);
    let b = y1 - a * x1;
    let linearFunction = new LinearFunction(a, b);
    return linearFunction;
  }

  // funkcja znajdująca równanie funkcji liniowej prostopadłej do podanej funkcji i punktu przecięcia
  function findPerpendicular(linearFunction, x, y) {
    let a = -1 / linearFunction.a;
    let b = y - a * x;
    let perpendicularFunction = new LinearFunction(a, b);
    return perpendicularFunction;
  }

  // funkcja do rysowania kątomierza
  function drawProtractor(canvas, result) {
    let x, y, x1, x2, y1, y2;
    // czyszczenie płótna
    canvas.clearRect(0, 0, 2000, 1250);

    // oś talerza, trzpień
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y,
      36,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // krzyżyk na trzpieniu
    canvas.strokeStyle = "#ff0000";
    canvas.beginPath();
    canvas.moveTo(
      result.mountingDistanceParams.spindle.x - 20,
      result.mountingDistanceParams.spindle.y
    );
    canvas.lineTo(
      result.mountingDistanceParams.spindle.x + 20,
      result.mountingDistanceParams.spindle.y
    );
    canvas.moveTo(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y - 20
    );
    canvas.lineTo(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y + 20
    );
    canvas.stroke();
    canvas.strokeStyle = "#000000";

    // ostatnia wewnętrzna ścieżka płyty
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y,
      603,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // wewnętrzny punkt zerowy
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y,
      result.innerNullPointCoord.alignment.np1,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // punkt osadzenia igły dla wewnętrznego punktu zerowego
    canvas.fillStyle = "#ff0000";
    canvas.beginPath();
    canvas.arc(
      result.innerNullPointCoord.x + result.mountingDistanceParams.spindle.x,
      result.innerNullPointCoord.y + result.mountingDistanceParams.spindle.y,
      5,
      0,
      2 * Math.PI
    );
    canvas.fill();
    canvas.closePath();
    canvas.stroke();

    // zewnętrzny punkt zerowy
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y,
      result.innerNullPointCoord.alignment.np2,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // punkt osadzenia igły dla zewnętrznego punktu zerowego
    let outerNullPointCoord = calcOuterNullPointCoord(result);
    canvas.fillStyle = "#ff0000";
    canvas.beginPath();
    canvas.arc(outerNullPointCoord.x, outerNullPointCoord.y, 5, 0, 2 * Math.PI);
    canvas.fill();
    canvas.closePath();
    canvas.stroke();

    // zewnętrzna ścieżka odtwarzania na płycie
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.spindle.x,
      result.mountingDistanceParams.spindle.y,
      1406,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // odległość skuteczna; łuk, jaki zatacza ramię gramofonu
    canvas.beginPath();
    canvas.arc(
      result.mountingDistanceParams.armPivot.x,
      result.mountingDistanceParams.armPivot.y,
      result.effectiveLength,
      0,
      2 * Math.PI
    );
    canvas.closePath();
    canvas.stroke();

    // linia wyznaczająca podstawę pod wewnętrzny punkt zerowy
    x1 = result.mountingDistanceParams.spindle.x;
    y1 = result.mountingDistanceParams.spindle.y;
    x2 = x1 + result.innerNullPointCoord.x;
    y2 = y1 + result.innerNullPointCoord.y;
    let innerBaseLinearFunction = linearFunction(x1, y1, x2, y2);
    canvas.beginPath();
    x = x2 - 100;
    y = innerBaseLinearFunction.a * x + innerBaseLinearFunction.b;
    canvas.moveTo(x, y);
    y = innerBaseLinearFunction.a * (x + 200) + innerBaseLinearFunction.b;
    canvas.lineTo(x + 200, y);
    canvas.stroke();

    // linia wzdłuż wkładki gramofonowej dla wewnętrzego punktu zerowego
    let perpendicularFunction = findPerpendicular(
      innerBaseLinearFunction,
      x2,
      y2
    );
    canvas.beginPath();
    y = y2 + 200;
    x = (y - perpendicularFunction.b) / perpendicularFunction.a;
    canvas.moveTo(x, y);
    x = (y - 600 - perpendicularFunction.b) / perpendicularFunction.a;

    canvas.lineTo(x, y - 600);
    canvas.stroke();

    // linia wyznaczająca podstawę pod zewnętrzny punkt zerowy
    x1 = result.mountingDistanceParams.spindle.x;
    y1 = result.mountingDistanceParams.spindle.y;
    x2 = outerNullPointCoord.x;
    y2 = outerNullPointCoord.y;
    let outerBaseLinearFunction = linearFunction(x1, y1, x2, y2);
    canvas.beginPath();
    x = x2 - 100;
    y = outerBaseLinearFunction.a * x + outerBaseLinearFunction.b;
    canvas.moveTo(x, y);
    y = outerBaseLinearFunction.a * (x + 200) + outerBaseLinearFunction.b;
    canvas.lineTo(x + 200, y);
    canvas.stroke();

    // // linia wzdłuż wkładki gramofonowej dla zewnętrznego punktu zerowego
    perpendicularFunction = findPerpendicular(outerBaseLinearFunction, x2, y2);
    canvas.beginPath();
    y = y2 + 200;
    x = (y - perpendicularFunction.b) / perpendicularFunction.a;
    canvas.moveTo(x, y);
    x = (y - 600 - perpendicularFunction.b) / perpendicularFunction.a;

    canvas.lineTo(x, y - 600);
    canvas.stroke();
  }
});
