let output = document.getElementById('output')
let typesRadio = document.querySelectorAll('input[name="type"]')
let left = output.querySelector('#left')
let raster = output.querySelector('#raster')
let vector = output.querySelector('#vector')
console.log(typesRadio)

function init(){
  // let typesRadio = document.querySelectorAll('input[name="type"]')
  // output.style.display = 'block'
  typesRadio.forEach(rad => {
    rad.addEventListener('click', syncRadios)
  })
  syncRadios()
  
  let ranges = document.querySelectorAll('input[type="range"]')
  ranges.forEach(syncRangesLabels)

  document.querySelector('form').addEventListener('submit', submitForm)
}
init()

function syncRadios(){
  typesRadio.forEach(rad => {
    if(rad.checked){
      output.classList.add(rad.value)
    }
  })
}

function syncRangesLabels(range){
  function syncRL(){
    range.parentNode.querySelector('.value').innerHTML = range.value
  }
  range.oninput = syncRL
  syncRL()
}

function submitForm(e){
  e.preventDefault()
  let fileIn = document.getElementById('file-input')
  let fileURL = document.getElementById('file-url')
  let temp = 'nothing'
  if(fileIn.length > 0){
    temp = URL.createObjectURL(fileIn.files[0])
  }
  else if(fileURL.value){
    temp = fileURL.value
  }
  let config = getConfig()
  config.temp = temp
  console.log(config)
  newLeftCanvas(config).then(leftCanvas => newRightCanvas(leftCanvas, config))
}

let numericProps = ['stepSize', 'alpha', 'viewSize', 'computeSize', 'mutateTimes', 'beginShapes']
function getConfig(){
  let form = document.querySelector('form')
  let config = {}
  numericProps.forEach(prop => {
    config[prop] = Number(form.querySelector(`[name="${prop}"]`).value)
  })
  config['mutateAlpha'] = true

  config['shapes'] = []

  form.querySelectorAll('[name="shapeName"]').forEach(el => {
    if(el.checked){ config['shapes'].push(el.value)}
  })

  form.querySelectorAll('[name="fillOption"]').forEach(el => {
    if(el.checked){ 
      if(el.value == 'auto'){ config['fill'] = 'auto' }
      else{ config['fill'] = el.querySelector('[name="fillColor"]').value }
    }
  })

  return config
}

function diffIt(one, other){
  let sum = 0
  for(let i = 0; i < one.data.length; i++){
    if(i % 4 == 3){ continue }
    sum += Math.pow((other.data[i] - one.data[i]), 2)
  }
  return sum
}

function diff_dist(diff, pix){
  // I don't really understand the logic
  return Math.sqrt(diff / (3 * pix)) / 255
}

function dist_diff(dist, pix){
  // This as well
  return Math.pow(dist * 255, 2) * (3 * pix)
}

function inRange(x, l, h){
  // Really nice logic
  return Math.max(min, Math.min(max, x))
}

function getColorOfRange(color){
  return inRange(color, 0, 255)
}

function getFillColor(canvas){
	let iD = canvas.getImageData()
	let width = data.width
	let height = data.height
	let data = iD.data
	let rgb = [0, 0, 0]
	let count = 0
	let i
	for(let x = 0; x < width; x++){
		for(let y = 0; y < height; y++){
			if (x > 0 && y > 0 && x < width - 1 && y < height - 1){
        // Ignoring this because we only need boundary colors
        continue
      }
			count++
			i = 4 * (x + y * w) //Get the array index acc to x and y
			rgb[0] += d[i]
			rgb[1] += d[i + 1]
			rgb[2] += d[i + 2]
		}
	}
  // ~~ means return nearest lowest integer
	rgb = rgb.map(x => ~~(x / count)).map(getColorOfRange)
	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

class Canvas{
  constructor(width, height){
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')
    this.imageData = null
    // fillFull(this.)
  }
  static newBlankCanvas(config){
    return new Canvas(config.width, config.height).fillFull(config.fill)
  }

  static newLeftCanvas(config){
    if(config.temp == 'nothing'){ return Promise.resolve(this.newTestCanvas(config))}
    else{
      return new Promise(resolve => {
        let image = new Image()
        image.crossOrigin = true
        image.src = config.temp
        image.onload = e => {
          let computeScale = getScale(image.naturalWidth, image.naturalWidth, config.computeSize)
          let viewScale = getScale(image.naturalWidth, image.naturalWidth, config.viewSize)
          config.width = image.naturalWidth / computeScale
          config.height = image.naturalHeight / computeScale
          config.scale = computeScale / viewScale

          let canvas = new Canvas(config.width, config.height)
          canvas.ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

          if(config.fill == 'auto'){
            config.fill = getFillColor(canvas)
          }

          resolve(canvas)
        }
        image.onerror = e => {
          console.log(e)
          console.log('An error occured in loading the picture')
        }
      })
    }
  }

  static newTestCanvas(config){
    let [w, h] = [config.computeSize, config.computeSize]
    let canvas = new Canvas(w, h)
    canvas.fillFull('#fff')
    let ctx = canvas.ctx

    //Make test shape
    ctx.fillStyle="#f00"
    ctx.beginPath()
    ctx.arc(w / 4, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    ctx.fillStyle="#0f0"
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    ctx.fillStyle="#00f"
    ctx.beginPath()
    ctx.arc((3 * w) / 4, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    return canvas
  }

  static newRightCanvas(leftCanvas, config){
    
    left.appendChild(leftCanvas.canvas)

  }

  static fillFull(color){
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    return this
  }
  
  getImageData(){
    if(!this.imageData){
      this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }
    return this.imageData
  }

  diffCans(otherOne){
    return diffIt(this.data.getImageData(), otherOne.data.getImageData())
  }

  distCans(otherOne){
    let diff = this.diffCans(otherOne)
    return diff_dist(diff, this.canvas.width * this.canvas.height)
  }

}

class Optimiser{
  constructor(leftCanvas, config){
    this.config = config
    this.state = new State(leftCanvas, new Canvas)
  }
}

function getScale(wid, hei, siz){
  return Math.max(wid / siz, hei / siz, 1)
}