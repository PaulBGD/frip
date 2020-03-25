(function () {
    window.devicePixelRatio = 1;
    const requestAnimationFrame = window.requestAnimationFrame;

    const framesPerSlide = {};
    let currentArray = [];
    let currentSlide = 1;
    let recording = localStorage.getItem("recording") === "true";

    //
    // function countFrames() {
    //     frameCount++;
    //     requestAnimationFrame(countFrames);
    // }
    let startedRecording = false;

    function recordFrame(canvas) {
        const gl = canvas.getContext("webgl");
        // const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        // gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const newCanvas = document.createElement("canvas");
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        newCanvas.getContext("2d").drawImage(canvas, 0, 0);

        // const data = newCanvas.toDataURL("image/png");
        // console.log("data url", data);
        //
        // const link = document.createElement("a");
        // link.setAttribute("download", "slides.png");
        // link.setAttribute("href", data.replace("image/png", "image/octet-stream"));
        // link.click();

        return {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
            // pixels,
            canvas: newCanvas,
        };
    }

    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (context, opts = {}) {
        opts.preserveDrawingBuffer = true;
        return getContext.call(this, context, opts);
    };

    window.requestAnimationFrame = function () {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.getContext("webgl", {
                preserveDrawingBuffer: false,
            });
        }
        if (recording) {
            if (canvas) {
                if (!startedRecording) {
                    if (canvas.width === 1840 && canvas.height === 1036) {
                        setTimeout(() => {
                            startedRecording = true;
                            doRecord();
                        }, 3000);
                    }
                }

                if (startedRecording) {
                    currentArray.push(recordFrame(canvas));
                }
            }
        }
        return requestAnimationFrame.apply(window, arguments);
    };

    window._fr = () => {
        localStorage.setItem("recording", "true");
        const cur = location.href;
        const split = cur.split("?");
        location.href = split[0] + "?scaling=contain";
    };

    function doRecord() {
        if (!localStorage.getItem("recording")) {
            return;
        }
        localStorage.removeItem("recording");

        recording = true;

        const total = getTotalSlides();

        currentSlide = getCurrentSlide();
        if (currentSlide !== 1) {
            alert("Not on slide 1, internal bug. On " + currentSlide);
            return;
        }

        // function downloadScript() {
        //     var text = buildScript();
        //     var link = document.createElement("a");
        //     link.href = URL.createObjectURL(new Blob([text], {type: "application/javascript"}));
        //     const split = window.location.pathname.split("/");
        //     link.download = split[split.length - 1];
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);
        // }

        function removeDuplicates(array) {
            if (!array.length) {
                return [];
            }
            const {canvas} = array[0];
            const ctx = canvas.getContext("2d");
            const unique = [array[0]];
            let previousImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            mainLoop: for (let i = 1; i < array.length; i++) {
                const {canvas} = array[i];
                const ctx = canvas.getContext("2d");
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                for (let j = 0; j < previousImageData.data.byteLength; j++) {
                    if (previousImageData.data[j] !== imageData.data[j]) {
                        unique.push(array[i]);

                        previousImageData = imageData;
                        continue mainLoop;
                    }
                }
                previousImageData = imageData;
            }
            return unique;
        }

        function step() {
            currentSlide = getCurrentSlide();

            let currentFrames;
            if (currentSlide === 1) {
                currentFrames = [recordFrame(document.querySelector("canvas"))];
            } else {
                currentFrames = currentArray;
            }

            currentArray = [];
            framesPerSlide[currentSlide] = removeDuplicates(currentFrames);

            if (currentSlide < total) {
                goForward();
                setTimeout(step, 400);
            } else {
                recording = false;
                const totalSlides = Object.values(framesPerSlide).reduce((num, arr) => arr.length + num, 0);
                console.log("We have", {totalSlides});
                // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // let i = 0;
                // Object.values(framesPerSlide).forEach(frames => {
                //     for (const {width, height, pixels} of frames) {
                //         for (let j = 0; j < pixels.byteLength; j++) {
                //             imageData.data[i++] = pixels[j];
                //         }
                //         console.log("added frame, at pixel count:", i);
                //     }
                // });

                const split = window.location.pathname.split("/");
                const pageName = split[split.length - 1];
                const json = JSON.stringify({
                    pages: Object.values(framesPerSlide).map((val, i) => ({
                        slides: val.length,
                        file: `${pageName}-${i}.png`,
                    })),
                    width: Object.values(framesPerSlide)[0][0].width,
                    height: Object.values(framesPerSlide)[0][0].height,
                });
                const link = document.createElement("a");
                link.setAttribute("download", `${pageName}.json`);
                link.setAttribute("href", `data:text/json;charset=utf-8,${encodeURIComponent(json)}`);
                link.click();

                Object.values(framesPerSlide).forEach((frames, index) => {
                    const canvas = document.createElement("canvas");
                    canvas.width = Object.values(framesPerSlide)[0][0].width;
                    canvas.height = Object.values(framesPerSlide)[0][0].height * frames.length;
                    const ctx = canvas.getContext("2d");
                    let i = 0;

                    for (const {canvas} of frames) {
                        ctx.drawImage(canvas, 0, canvas.height * (i++));
                    }

                    canvas.toBlob(blob => {
                        const link = document.createElement("a");
                        link.setAttribute("download", `${pageName}-${index}.png`);
                        const url = window.URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.click();
                        window.URL.revokeObjectURL(url);
                    }, "image/png");
                });

            }
        }

        step();
        // setTimeout(step, 1000); // enough time for initial slide to render
    }

    function goBack() {
        const divs = document.getElementsByTagName("div");
        for (const div of divs) {
            if (div.className && div.className.indexOf("footer--statusText") === 0) {
                const parent = div.parentNode;
                parent.children[0].click();
            }
        }
    }

    function goForward() {
        const divs = document.getElementsByTagName("div");
        for (const div of divs) {
            if (div.className && div.className.indexOf("footer--statusText") === 0) {
                const parent = div.parentNode;
                parent.children[2].click();
            }
        }
    }

    function getCurrentSlide() {
        const divs = document.getElementsByTagName("div");
        for (const div of divs) {
            if (div.className && div.className.indexOf("footer--statusText") === 0) {
                return +div.innerText.split(" / ")[0];
            }
        }
    }

    function getTotalSlides() {
        const divs = document.getElementsByTagName("div");
        for (const div of divs) {
            if (div.className && div.className.indexOf("footer--statusText") === 0) {
                return +div.innerText.split(" / ")[1];
            }
        }
    }

})();
