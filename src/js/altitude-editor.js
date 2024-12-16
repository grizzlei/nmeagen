const canvas = document.getElementById('altitude-editor');
const ctx = canvas.getContext('2d');

// Define bounds
const xMin = 0, xMax = 1, yMin = 0, yMax = 1;
canvas.style.width ='100%';
canvas.style.height='100%';
canvas.width  = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
const canvasHeight = canvas.height;
const canvasWidth = canvas.width;
const margin = 30; // Margin around the grid
let altitudeCurvePoints = []; // Array to hold control points
let selectedPoints = []; // Array to hold selected points
let dragGroup = false; // Flag for group dragging
let dragStartY = 0; // Start Y position for group dragging
let selectionRect = null; // Rectangle for selection
let geoidUndulation = 0.0;
let maxAltitude = 100;

// Convert normalized values to canvas coordinates
const toCanvasX = x => margin + (x - xMin) / (xMax - xMin) * (canvasWidth - 2 * margin);
const toCanvasY = y => canvasHeight - margin - (y - yMin) / (yMax - yMin) * (canvasHeight - 2 * margin);

// Convert canvas coordinates to normalized values
const toNormalizedY = y => ((canvasHeight - margin - y) / (canvasHeight - 2 * margin)) * (yMax - yMin) + yMin;

// Function to initialize points dynamically
const initializePoints = (numPoints) => {
  altitudeCurvePoints = [];
  for (let i = 0; i < numPoints; i++) {
    const x = xMin + (xMax - xMin) * (i / (numPoints - 1));
    altitudeCurvePoints.push({ x, y: 0 }); // Start all points with y = 0
  }
  draw();
};

// Draw grid, curve, and points
const draw = () => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // draw text
  const fontSize = 10;
  ctx.fillStyle = '#000';
  ctx.font = `${fontSize}px Arial`;
  ctx.fillText(`Max. Altitude (HAE): ${maxAltitude} \tm`,margin, margin - fontSize);
  ctx.fillText(`Geoidal Separation: ${geoidUndulation} \tm`,margin, canvasHeight - margin + fontSize * 2);
  ctx.stroke();

  // Draw grid
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  for (let x = xMin; x <= xMax; x += 0.1) {
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, margin);
    ctx.lineTo(cx, canvasHeight - margin);
    ctx.stroke();
  }
  for (let y = yMin; y <= yMax; y += 0.1) {
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(margin, cy);
    ctx.lineTo(canvasWidth - margin, cy);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, canvasHeight - margin);
  ctx.lineTo(canvasWidth - margin, canvasHeight - margin);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, canvasHeight - margin);
  ctx.stroke();

  // Draw curve
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(altitudeCurvePoints[0].x), toCanvasY(altitudeCurvePoints[0].y));
  for (let i = 1; i < altitudeCurvePoints.length; i++) {
    ctx.lineTo(toCanvasX(altitudeCurvePoints[i].x), toCanvasY(altitudeCurvePoints[i].y));
  }
  ctx.stroke();

  // Draw control points
  altitudeCurvePoints.forEach((point, index) => {
    const cx = toCanvasX(point.x);
    const cy = toCanvasY(point.y);
    // ctx.strokeStyle = '#00f';
    ctx.strokeStyle = selectedPoints.includes(index) ? '#f00' : '#00f';
    ctx.lineWidth = 2;
    ctx.fillStyle = selectedPoints.includes(index) ? '#ff8f97' : '#b0c4de';
    // ctx.fillStyle = '#b0c4de';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw selection rectangle if active
  if (selectionRect) {
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
  }
};

// Handle dragging of points
let draggingPoint = null;
let isSelecting = false; // Flag for rectangle selection

canvas.addEventListener('mousedown', e => {
  const mouseX = e.offsetX, mouseY = e.offsetY;

  const hitPoint = altitudeCurvePoints.findIndex((point, index) => {
    const cx = toCanvasX(point.x);
    const cy = toCanvasY(point.y);
    return Math.hypot(mouseX - cx, mouseY - cy) < 10;
  });

  if (hitPoint !== -1 && !e.shiftKey) {
    // Dragging a single point
    draggingPoint = { point: altitudeCurvePoints[hitPoint], index: hitPoint };
  } else if (!e.shiftKey) {
    // Start rectangle selection
    isSelecting = true;
    selectionRect = { x: mouseX, y: mouseY, width: 0, height: 0 };
  } else if (selectedPoints.length > 0) {
    // Start group dragging
    dragGroup = true;
    dragStartY = mouseY;
  }

  draw();
});

canvas.addEventListener('mousemove', e => {
  if (draggingPoint) {
    const mouseY = e.offsetY;
    draggingPoint.point.y = Math.min(yMax, Math.max(yMin, toNormalizedY(mouseY))); // Constrain Y
    draw();
  } else if (isSelecting && selectionRect) {
    // Update rectangle dimensions
    selectionRect.width = e.offsetX - selectionRect.x;
    selectionRect.height = e.offsetY - selectionRect.y;
    draw();
  } else if (dragGroup) {
    const deltaY = e.offsetY - dragStartY;
    const normalizedDeltaY = toNormalizedY(dragStartY) - toNormalizedY(dragStartY + deltaY);
    selectedPoints.forEach(index => {
      altitudeCurvePoints[index].y = Math.min(yMax, Math.max(yMin, altitudeCurvePoints[index].y - normalizedDeltaY));
    });
    dragStartY = e.offsetY;
    draw();
  }
});

canvas.addEventListener('mouseup', e => {
  if (isSelecting && selectionRect) {
    // Finalize selection
    const rect = {
      x1: Math.min(selectionRect.x, selectionRect.x + selectionRect.width),
      x2: Math.max(selectionRect.x, selectionRect.x + selectionRect.width),
      y1: Math.min(selectionRect.y, selectionRect.y + selectionRect.height),
      y2: Math.max(selectionRect.y, selectionRect.y + selectionRect.height)
    };

    selectedPoints = altitudeCurvePoints.reduce((selected, point, index) => {
      const cx = toCanvasX(point.x);
      const cy = toCanvasY(point.y);
      if (
        cx >= rect.x1 &&
        cx <= rect.x2 &&
        cy >= rect.y1 &&
        cy <= rect.y2
      ) {
        selected.push(index);
      }
      return selected;
    }, []);

    isSelecting = false;
    selectionRect = null;
    draw();
  }

  draggingPoint = null;
  dragGroup = false;
});

// Function to get point data
const getPoints = () => {
  return altitudeCurvePoints.map((point, index) => ({
    index,
    x: point.x,
    y: point.y
  }));
};

const updateCurvePoints = (pointArr) => {
  altitudeCurvePoints = [];
  for(let i = 0; i < pointArr.length; i++)
  {
    const x = xMin + (xMax - xMin) * (i / (pointArr.length - 1)); 
    const y = 0;
    altitudeCurvePoints.push({x, y});
  }
  if(altitudeCurvePoints.length > 1)
  {
    draw();
  }
}

const onMaxAltitudeChange = () => {
  const newAltitude = $("#max-altitude").val();
  const newAltitudeValid =
  newAltitude !== "" && !isNaN(newAltitude) && parseFloat(newAltitude) > 0.0;
  if(newAltitudeValid)
  {
    maxAltitude = parseFloat(newAltitude);
    draw();
  }
}

const onGeoidUndulationChange = () => {
  const newGeoidUndulation = $("#geoid-undulation").val();
  const newGeoidUndulationValid =
  newGeoidUndulation !== "" && !isNaN(newGeoidUndulation);
  if(newGeoidUndulationValid)
  {
    geoidUndulation = parseFloat(newGeoidUndulation);
    draw();
  }
}

$("#max-altitude").on("input propertychange paste", onMaxAltitudeChange);

$("#geoid-undulation").on("input propertychange paste", onGeoidUndulationChange);