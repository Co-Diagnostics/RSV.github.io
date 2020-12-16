
let mismatchPath = "data\\mismatches.csv"
let organism = 'RSV'

// read in the data in asyc function
Promise.all([
    d3.csv(mismatchPath), 
    d3.csv('data\\forwards.csv'),
    d3.csv('data\\reverses.csv')
]).then(function(data){
    let mismatchData = data[0]
    let forwardsData = data[1]
    let reversesData = data[2]

    // call main class

    new Main(mismatchData, forwardsData, reversesData, organism)

})


class Main{

    constructor(mismatchData, forwardsData, reversesData, organism){
        this.organism = organism
        this.mismatchData = mismatchData.map(d=>{
           return{ 
                mismatches: parseInt(d.mismatches),
                positions: parseInt(d.positions), 
                bases: d.bases, 
                number_of_sequences: parseInt(d.number_of_sequences)
        }
        })

        this.forwardsData = forwardsData.map(d=>{
            return{
                name: d.name,
                sequence: d.sequence,
                start_position: parseInt(d.start_position), 
                stop_position: parseInt(d.stop_position), 
                primer_length: parseInt(d.primer_length), 
                capture_length: parseInt(d.capture_length)

            }
        })
        this.reversesData = reversesData.map(d=>{
            return{
                name: d.name,
                sequence: d.sequence,
                start_position: parseInt(d.start_position), 
                stop_position: parseInt(d.stop_position), 
                primer_length: parseInt(d.primer_length), 
                capture_length: parseInt(d.capture_length)

            }
        })
        // set up visualization dimensions
        this.vizWidth = 1200
        this.vizHeight = 800
        this.duration = 1500



        // set up main visualization svg


        this.hist_svg = d3.select('#visualization').append('svg')
            .attr('id', 'hist-svg')
            .classed('histSVG', true)
            .attr('width', this.vizWidth)
            .attr('height', this.vizHeight)

        this.histMargins = {top: 10, bottom: 20, left: 70, right:10}

        // settings
        this.vizselection = 'default'

        
        // call methods needed on page load
        this.textAdder()
        this.dropDownMenus()
        this.drawHist()
        this.eventListeners()
    };

    textAdder(){

        /* this method is to add additional information and text to the page as necessary */
        d3.select('#header')
            .append('h1')
            .classed('header', true)
            .text('CoPrimer Mismatch Visualization for ' + this.organism)

        // add a tooltip 
        d3.select('body').append('div')
            .classed('tooltip', true)
            .attr('id', 'hist-tooltip')
            .style('visibility', 'hidden')
            
            



    };

    dropDownMenus(){
        
        let optionsDiv = d3.select('#header').append('div')
            .attr('id', 'options')
            .append('label')
                .text('Select a Forward   ')

        
        optionsDiv.append('select')
            .classed('dropDown', true)
            .attr('id', 'forwardDropdown')


        d3.select('#forwardDropdown')
            .selectAll('myOptions')
            .data(this.forwardsData)
            .enter()
            .append('option')
            .text(d=>d.name)
            .attr('value', d=>d.name)

        optionsDiv.append('g')
            .attr('id', 'reverse-group')
            .classed('reverseGroup', true)
        
        
        d3.select('#reverse-group').append('label')
            .text('Select a Reverse ')

        d3.select('#reverse-group').append('select')
            .classed('dropDown', true)
            .attr('id', 'reverseDropdown')

        d3.select('#reverseDropdown')
            .selectAll('myOptions')
            .data(this.reversesData)
            .join('option')
            .text(d=>d.name)
            .attr('value', d=>d.name)


        // view selection

        let viewOptions = ['Default', 'Forward', 'Reverse', 'Full Genome']

        optionsDiv.append('g')
            .attr('id', 'view-group')
            .append('label')
            .text('Select a View')
            .classed('view-selection', true)
        
        d3.select('#view-group')
            .append('select')
            .classed('dropDown', true)
            .attr('id', 'view-select')
            

        d3.select('#view-select')
            .selectAll('myOptions')
            .data(viewOptions)
            .join('option')
            .text(d=>{
                console.log(d)
                return d
            })
            .attr('value', d=>d)


    };

    drawHist(){
        console.log(this.mismatchData)
        let forwardSelection = d3.select('#forwardDropdown').node().value
        let reverseSelection = d3.select('#reverseDropdown').node().value
        this.vizselection = d3.select('#view-select').node().value

        let forwardPrimer = this.forwardsData.filter(d=>d.name === forwardSelection)[0]
        let reversePrimer = this.reversesData.filter(d=>d.name === reverseSelection)[0]
        let start = parseInt(forwardPrimer.start_position)
        let stop = parseInt(reversePrimer.stop_position)
        let ampliconLength = stop - start

        let maxPosition = d3.max(this.mismatchData.map(d=>d.positions))


        // define domain to be 10 bp beyond the span of the primer
        let domain
        if (this.vizselection === 'Default'){
            domain = [start-10, stop + 10]
        }
        else if (this.vizselection === 'Forward'){
            domain = [start-10, forwardPrimer.stop_position + 10]
        }
        else if (this.vizselection === 'Reverse'){
            domain = [reversePrimer.start_position - 10, stop + 10]
        }
        else if (this.vizselection === 'Full Genome'){
            domain = [0, maxPosition]
        }

        // filter the histogram data
        let histData = this.mismatchData.filter(d=>d.positions>=domain[0] && d.positions<=domain[1])

        let maxY = d3.max(histData.map(d=>d.mismatches/d.number_of_sequences))


        // x scale and draw x axis
        let x = d3.scaleLinear()
            .domain(domain)
            .range([this.histMargins.left, this.vizWidth - this.histMargins.right])

        this.x = x

        let histSVG = d3.select('#hist-svg')

        histSVG.append('g')
            .attr('id', 'hist-xaxis')
            .attr('transform', `translate(0, ${this.vizHeight-this.histMargins.bottom-100})`)
            .call(d3.axisBottom(x));
        
        let y = d3.scaleLinear()
            .domain([0, maxY + 0.1])
            .range([this.vizHeight-this.histMargins.top-100, this.histMargins.bottom])

        this.y = y
            

        let yAxis = d3.axisLeft(y).ticks(10)

        histSVG.append('g')
            .attr('id', 'hist-yaxis')
            .attr('transform', `translate(${this.histMargins.left}, -${this.histMargins.top})`)
            .call(yAxis);

            
        // append the rectangles

        histSVG.append('g')
            .attr('id', 'hist-bars')
        
        
        d3.select('#hist-bars').selectAll('rect')
            .data(histData)
            .enter()
            .append('rect')
                .classed('histbar', true)
                .attr('x', d=>x(d.positions - .5))
                .attr('y', d=>y(d.mismatches/d.number_of_sequences))
                .attr('height', d=>{
                    let height = this.vizHeight - y(d.mismatches/d.number_of_sequences) -100 - this.histMargins.bottom
                    if (height > 0){
                        return height
                    }else{return 0}
                    })
                .attr('width', this.vizWidth/histData.length -1)
                


        
        // Draw primer positions
        let primers = []

        // color scale for primers
        let color = d3.scaleOrdinal()
            .domain(['forward', 'reverse'])
            .range(['red', 'blue'])

        // forward primer
        let forwardPrimingRegion = {
            type: 'forward',
            function: 'primer',
            start: parseInt(forwardPrimer.start_position), 
            stop: parseInt(forwardPrimer.start_position) + parseInt(forwardPrimer.primer_length)
        }
        primers.push(forwardPrimingRegion)
        let forwardCaptureRegion = {
            type: 'forward',
            function: 'capture',
            start: parseInt(forwardPrimer.stop_position) - parseInt(forwardPrimer.capture_length), 
            stop: parseInt(forwardPrimer.stop_position)
        }
        primers.push(forwardCaptureRegion)

        // reverse primer
        let reversePrimingRegion = {
            type: 'reverse',
            function: 'primer',
            start: parseInt(reversePrimer.stop_position) - parseInt(reversePrimer.capture_length), 
            stop: parseInt(reversePrimer.stop_position)
        }
        primers.push(reversePrimingRegion)
        let reverseCaptureRegion = {
            type: 'reverse', 
            function: 'capture',
            start: parseInt(reversePrimer.start_position),
            stop: parseInt(reversePrimer.start_position) + parseInt(reversePrimer.primer_length)
        }
        primers.push(reverseCaptureRegion)

        console.log(primers)
        
        
        let primersGroup = d3.select('#hist-svg').append('g')
            .attr('id', 'primers-group')
            .attr('transform', `translate(0, ${this.vizHeight-this.histMargins.bottom - 75})`)

        
        primersGroup.selectAll('rect')
            .data(primers)
            .enter()
            .append('rect')
                .attr('x', d=>x(d.start))
                .attr('width', d=>{
                    return x(d.stop)-x(d.start)
                })
                .attr('height', 10)
                .style('fill', d=>color(d.type))
        
    };
 
    updateHist(){
        let forwardSelection = d3.select('#forwardDropdown').node().value
        let reverseSelection = d3.select('#reverseDropdown').node().value
        this.vizselection = d3.select('#view-select').node().value

        let forwardPrimer = this.forwardsData.filter(d=>d.name === forwardSelection)[0]
        let reversePrimer = this.reversesData.filter(d=>d.name === reverseSelection)[0]
        let start = parseInt(forwardPrimer.start_position)
        let stop = parseInt(reversePrimer.stop_position)
        let ampliconLength = stop - start

        let maxPosition = d3.max(this.mismatchData.map(d=>d.positions))

        // define domain to be 10 bp beyond the span of the primer
        let domain
        if (this.vizselection === 'Default'){
            domain = [start-10, stop + 10]
        }
        else if (this.vizselection === 'Forward'){
            domain = [start-10, forwardPrimer.stop_position + 10]
        }
        else if (this.vizselection === 'Reverse'){
            domain = [reversePrimer.start_position - 10, stop + 10]
        }
        else if (this.vizselection === 'Full Genome'){
            domain = [0, maxPosition]
        }
        

        // filter the histogram data
        let histData = this.mismatchData.filter(d=>d.positions>=domain[0] && d.positions<=domain[1])

        let maxY = d3.max(histData.map(d=>d.mismatches/d.number_of_sequences))


        // x scale and draw x axis
        let x = d3.scaleLinear()
            .domain(domain)
            .range([this.histMargins.left + 11, this.vizWidth - this.histMargins.right])
        this.x = x

        // update x-axis
        d3.select('#hist-xaxis')
            .transition().duration(this.duration)
            .call(d3.axisBottom(x));


        let y = d3.scaleLinear()
            .domain([0, maxY + 0.1])
            .range([this.vizHeight-this.histMargins.top-100, this.histMargins.bottom])

        this.y = y

        
        d3.select('#hist-yaxis')
            .transition().duration(this.duration)
            .call(d3.axisLeft(y))


        // update bars

        d3.select('#hist-bars').selectAll('rect')
            .data(histData)
            
            .join(enter=>{enter
                .append('rect')
                .classed('histbar', true)
                .attr('x', d=>x(d.positions - 0.5))
                .attr('y', d=>y(d.mismatches/d.number_of_sequences))
                .attr('height', d=>{
                    let height = this.vizHeight - y(d.mismatches/d.number_of_sequences) -100 - this.histMargins.bottom
                    if (height > 0){
                        return height
                    }else{return 0}
                    })
                .attr('width', d=>{
                    let width = this.vizWidth/histData.length - 1
                    if (width > 0) {return width}
                    else{return 0.1}
                })
                .transition().duration(this.duration)
            
            }, 
            update=>{update.transition().duration(this.duration)
                .attr('x', d=>x(d.positions - 0.5))
                .attr('y', d=>y(d.mismatches/d.number_of_sequences))
                .attr('height', d=>{
                    let height = this.vizHeight - y(d.mismatches/d.number_of_sequences) -100 - this.histMargins.bottom
                    if (height > 0){
                        return height
                    }else{return 0}
                    })
                .attr('width', d=>{
                    let width = this.vizWidth/histData.length - 1
                    if (width > 0) {return width}
                    else{return 0.1}
                }
                    )
                
            }, 
            exit => {exit.transition().duration(this.duration)
                .remove()
            }
            )

        // update primer positions
        let primers = []

        // color scale for primers
        let color = d3.scaleOrdinal()
            .domain(['forward', 'reverse'])
            .range(['red', 'blue'])

        // forward primer
        let forwardPrimingRegion = {
            type: 'forward',
            function: 'primer',
            start: parseInt(forwardPrimer.start_position), 
            stop: parseInt(forwardPrimer.start_position) + parseInt(forwardPrimer.primer_length)
        }
        primers.push(forwardPrimingRegion)
        let forwardCaptureRegion = {
            type: 'forward',
            function: 'capture',
            start: parseInt(forwardPrimer.stop_position) - parseInt(forwardPrimer.capture_length), 
            stop: parseInt(forwardPrimer.stop_position)
        }
        primers.push(forwardCaptureRegion)

        // reverse primer
        let reversePrimingRegion = {
            type: 'reverse',
            function: 'primer',
            start: parseInt(reversePrimer.stop_position) - parseInt(reversePrimer.capture_length), 
            stop: parseInt(reversePrimer.stop_position)
        }
        primers.push(reversePrimingRegion)
        let reverseCaptureRegion = {
            type: 'reverse', 
            function: 'capture',
            start: parseInt(reversePrimer.start_position),
            stop: parseInt(reversePrimer.start_position) + parseInt(reversePrimer.primer_length)
        }
        primers.push(reverseCaptureRegion)
        
        
        let primersGroup = d3.select('#primers-group')

        
        primersGroup.selectAll('rect')
            .data(primers)
            .join(
                enter=>{enter.append('rect')
                    .attr('x', d=>x(d.start + 0.5))
                    .attr('width', d=>{
                        return x(d.stop)-x(d.start)
                    })
                    .attr('height', 10)
                    .style('fill', d=>color(d.type))},

                update=>{update.transition().duration(this.duration)
                    .attr('x', d=>x(d.start + 0.5))
                    .attr('width', d=>{
                        return x(d.stop)-x(d.start)
                    })
                    .attr('height', 10)
                    .style('fill', d=>color(d.type))
                },
                exit=>{exit.transition().duration(this.duration)
                    .remove()    
                }
            )
            


        };

    eventListeners(){
        d3.select('#forwardDropdown').on('change', event=>{
            this.updateHist()
        })
        d3.select('#reverseDropdown').on('change', event=>{
            this.updateHist()
        })
        d3.select('#view-select').on('change', event=>{
            this.updateHist()
        })

        let bars = d3.select('#hist-bars')
        
        // add hover color and tooltip to bars

        bars.on('mouseover', event=>{
            let target = d3.select(event.target)
            let data = target._groups[0][0].__data__
            let percentMismatch = data.mismatches/data.number_of_sequences*100
            let formattedText = `Position: ${data.positions}\nNumber of mismatches: ${data.mismatches} \nPercent Mismatches: ${percentMismatch.toFixed(2)}%\nMost common base: ${data.bases}`
            let top = this.y(data.mismatches/data.number_of_sequences) + 80
            let left = this.x(data.positions)


            // select tooltip div
            let tooltip = d3.select('#hist-tooltip')
                .text(formattedText)
                .style('visibility', 'visible')
                .style('top', `${top}px`)
                .style('left', `${left}px`)
            
            target.classed('hovered', true)

        bars.on('mouseout', event=>{
            let target = d3.select(event.target)
            target.classed('hovered', false)

            tooltip
                .style('visibility', 'hidden')
        })
        })
};

        

    







}

    