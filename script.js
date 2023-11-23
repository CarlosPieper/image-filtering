function loadImage() {
  let select = document.getElementById('imageSelect');
  let selectedImage = select.options[select.selectedIndex].value;

  let originalCanvas = document.getElementById('originalCanvas');
  let filteredCanvas = document.getElementById('filteredCanvas');
  let originalCtx = originalCanvas.getContext('2d');
  let filteredCtx = filteredCanvas.getContext('2d');

  let img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);

    applyFilters(originalCtx, filteredCtx);
  };
  img.src = selectedImage;
}

function applyFilters(originalCtx, filteredCtx) {
  let applyBlur = document.getElementById('applyBlur').checked;
  let applyMedian = document.getElementById('applyMedian').checked;
  let grayScaleValue = document.getElementById('grayScaleSlider').value;
  let isolateRedColorValue = document.getElementById('isolateRedColorSlider').value;
  let isolateGreenColorValue = document.getElementById('isolateGreenColorSlider').value;
  let isolateBlueColorValue = document.getElementById('isolateBlueColorSlider').value;

  let imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

  if (applyMedian) {
    imageData = applyMedianFilter(imageData, 0);
  }
  if (applyBlur) {
    imageData = applyGaussianBlur(imageData, 5);
  }

  if (grayScaleValue > 0) {
    imageData = applyGrayScale(imageData, grayScaleValue);
  }

  imageData = isolatePrimaryColors(imageData, isolateRedColorValue, isolateGreenColorValue, isolateBlueColorValue);

  filteredCtx.clearRect(0, 0, filteredCanvas.width, filteredCanvas.height);
  filteredCtx.putImageData(imageData, 0, 0);
}

function applyGaussianBlur(imageData, blurRadius) {
  let data = imageData.data;
  let width = imageData.width;
  let height = imageData.height;
  let radius = blurRadius;

  let tempData = new Uint8ClampedArray(data);

  let len = Math.floor(radius) * 2 + 1;
  let radiusSquared = radius * radius;
  let piSigmaSquared = Math.PI * 2 * radiusSquared;
  let weightSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let alphaSum = 0;
      weightSum = 0;

      for (let iy = -len; iy <= len; iy++) {
        for (let ix = -len; ix <= len; ix++) {
          let x1 = Math.min(width - 1, Math.max(0, x + ix));
          let y1 = Math.min(height - 1, Math.max(0, y + iy));

          let displacement = (y1 * width + x1) * 4;
          let distanceSquared = ix * ix + iy * iy;

          if (distanceSquared <= radiusSquared) {
            let weight = Math.exp(-(distanceSquared) / (2 * radiusSquared)) / piSigmaSquared;

            redSum += data[displacement] * weight;
            greenSum += data[displacement + 1] * weight;
            blueSum += data[displacement + 2] * weight;
            alphaSum += data[displacement + 3] * weight;

            weightSum += weight;
          }
        }
      }

      let displacement = (y * width + x) * 4;
      tempData[displacement] = Math.round(redSum / weightSum);
      tempData[displacement + 1] = Math.round(greenSum / weightSum);
      tempData[displacement + 2] = Math.round(blueSum / weightSum);
      tempData[displacement + 3] = Math.round(alphaSum / weightSum);
    }
  }

  return new ImageData(tempData, width, height);
}

function applyMedianFilter(imageData, counter) {
  var data = imageData.data.slice();
  var width = imageData.width;
  var height = imageData.height;
  var newImageData = new ImageData(new Uint8ClampedArray(data), width, height);

  var side = 3;
  var halfSide = Math.floor(side / 2);

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var redValues = [];
      var greenValues = [];
      var blueValues = [];

      for (var offsetY = -halfSide; offsetY <= halfSide; offsetY++) {
        for (var offsetX = -halfSide; offsetX <= halfSide; offsetX++) {
          var pixelY = Math.min(height - 1, Math.max(0, y + offsetY));
          var pixelX = Math.min(width - 1, Math.max(0, x + offsetX));
          var pixelIndex = (pixelY * width + pixelX) * 4;

          redValues.push(data[pixelIndex]);
          greenValues.push(data[pixelIndex + 1]);
          blueValues.push(data[pixelIndex + 2]);
        }
      }

      function bubbleSort(arr) {
        var len = arr.length;
        for (var i = 0; i < len - 1; i++) {
          for (var j = 0; j < len - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
              var temp = arr[j];
              arr[j] = arr[j + 1];
              arr[j + 1] = temp;
            }
          }
        }
      }

      bubbleSort(redValues);
      bubbleSort(greenValues);
      bubbleSort(blueValues);

      var medianIndex = Math.floor(redValues.length / 2);
      newImageData.data[(y * width + x) * 4] = redValues[medianIndex];
      newImageData.data[(y * width + x) * 4 + 1] = greenValues[medianIndex];
      newImageData.data[(y * width + x) * 4 + 2] = blueValues[medianIndex];
      newImageData.data[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }

  counter++;
  if (counter == 5)
    return newImageData;
  else
    return applyMedianFilter(newImageData, counter);
}


function isolatePrimaryColors(imageData, redPercentage, greenPercentage, bluePercentage) {
  var data = imageData.data;
  var len = data.length;
  var newImageData = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);

  for (var i = 0; i < len; i += 4) {
    var red = data[i];
    var green = data[i + 1];
    var blue = data[i + 2];

    var newRed = red * redPercentage / 100;
    var newGreen = green * greenPercentage / 100;
    var newBlue = blue * bluePercentage / 100;

    newImageData.data[i] = newRed;
    newImageData.data[i + 1] = newGreen;
    newImageData.data[i + 2] = newBlue;
    newImageData.data[i + 3] = data[i + 3];
  }

  return newImageData;
}


function applyGrayScale(imageData, sliderValue) {
  var data = imageData.data;
  var len = data.length;
  var newImageData = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);

  var factor = sliderValue / 255;

  for (var i = 0; i < len; i += 4) {
    var red = data[i];
    var green = data[i + 1];
    var blue = data[i + 2];

    var gray = (red + green + blue) / 3;

    var newRed = red * (1 - factor) + gray * factor;
    var newGreen = green * (1 - factor) + gray * factor;
    var newBlue = blue * (1 - factor) + gray * factor;

    newImageData.data[i] = newRed;
    newImageData.data[i + 1] = newGreen;
    newImageData.data[i + 2] = newBlue;
    newImageData.data[i + 3] = data[i + 3];
  }

  return newImageData;
}

document.getElementById('grayScaleSlider').addEventListener('input', loadImage);
document.getElementById('isolateRedColorSlider').addEventListener('input', loadImage);
document.getElementById('isolateGreenColorSlider').addEventListener('input', loadImage);
document.getElementById('isolateBlueColorSlider').addEventListener('input', loadImage);
document.getElementById('imageSelect').addEventListener('change', loadImage);
document.getElementById('applyBlur').addEventListener('change', loadImage);
document.getElementById('applyMedian').addEventListener('change', loadImage);
loadImage();
