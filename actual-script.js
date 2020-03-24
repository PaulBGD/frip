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
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        return {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
            pixels,
        };
    }

    window.requestAnimationFrame = function () {
        if (recording) {
            const canvas = document.querySelector("canvas");
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
                    console.time("record");
                    currentArray.push(recordFrame(canvas));
                    console.timeEnd("record");
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

        async function removeDuplicates(array) {
            if (!array.length) {
                return [];
            }
            const unique = [array[0]];
            mainLoop: for (let i = 1; i < array.length; i++) {
                const current = array[i].pixels;
                const previous = array[i - 1].pixels;

                for (let j = 0; j < previous.byteLength; j++) {
                    if (previous[j] !== current[j]) {
                        unique.push(array[i]);
                        continue mainLoop;
                    }
                }
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

            recording = false;
            console.log("processing", currentSlide);
            removeDuplicates(currentFrames)
                .then(uniq => {
                    recording = true;
                    currentArray = [];
                    framesPerSlide[currentSlide] = uniq;

                    if (currentSlide < total) {
                        goForward();
                        setTimeout(step, 400);
                    } else {
                        console.log(framesPerSlide);
                        recording = false;
                        console.log("done!");
                    }
                });
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
